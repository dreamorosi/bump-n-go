import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ChangeTypeHeaderMapping } from './constants.js';
import type {
	ChangelogSections,
	SectionsByType,
	SectionsByWorkspace,
	Workspace,
} from './types.js';

/**
 * Converts commit subjects to include clickable links for issues and commits.
 *
 * Transforms GitHub issue references (#123) into clickable links and appends
 * commit hash links when available. Enhances changelog readability by providing
 * direct navigation to related issues and commits.
 *
 * @param subject - the commit subject line to process
 * @param baseUrl - the base repository URL for generating links
 * @param commitHash - optional commit hash to include as a link
 * @returns the subject with embedded markdown links
 *
 * @example
 * ```typescript
 * linkifyCommitReferences(
 *   "fix: resolve issue #123",
 *   "https://github.com/user/repo",
 *   "abc1234"
 * );
 * // Returns: "fix: resolve issue [#123](https://github.com/user/repo/issues/123) ([abc1234](https://github.com/user/repo/commit/abc1234))"
 * ```
 */
const linkifyCommitReferences = (
	subject: string,
	baseUrl: string,
	commitHash?: string
): string => {
	if (!baseUrl) return subject;

	let result = subject;

	// Match GitHub issue/PR references like #123
	result = result.replace(/#(\d+)/g, `[#$1](${baseUrl}/issues/$1)`);

	// Add commit hash link if provided
	if (commitHash) {
		const shortHash = commitHash.substring(0, 7);
		result += ` ([${shortHash}](${baseUrl}/commit/${commitHash}))`;
	}

	return result;
};

/**
 * Generates changelog sections from workspace commits.
 *
 * Processes all workspace commits to create structured changelog content
 * organized by commit type. Generates both main changelog sections (excluding
 * private packages) and workspace-specific sections (including all packages).
 * 
 * For single-package repositories, omits package name prefixes from changelog
 * entries to reduce redundancy. For monorepos, includes package name prefixes
 * for clarity.
 *
 * @param workspaces - record of all workspaces with their commits
 * @param baseUrl - the base repository URL for generating commit links
 * @returns object containing main and workspace-specific changelog sections
 */
const generateChangelogSections = (
	workspaces: Record<string, Workspace>,
	baseUrl: string
): ChangelogSections => {
	const linesSectionsByType: SectionsByType = new Map();
	const linesSectionsByWorkspace: SectionsByWorkspace = new Map();

	// Detect if this is a single-package repository
	const isSinglePackageRepo = Object.keys(workspaces).length === 1;

	for (const workspace of Object.values(workspaces)) {
		if (!workspace.changed) {
			continue;
		}
		for (const commit of workspace.commits) {
			const sectionHeader = ChangeTypeHeaderMapping[commit.type];
			const linkedSubject = linkifyCommitReferences(
				commit.subject,
				baseUrl,
				commit.hash
			);

			// Only add to main changelog if package is public
			if (!workspace.isPrivate) {
				if (!linesSectionsByType.has(sectionHeader)) {
					linesSectionsByType.set(sectionHeader, []);
				}
				
				// For single-package repos, omit package name prefix
				// For monorepos, include package name prefix for clarity
				const changelogEntry = isSinglePackageRepo
					? `- ${linkedSubject}`
					: `- **${workspace.shortName}** ${linkedSubject}`;
				
				linesSectionsByType
					.get(sectionHeader)
					?.push(changelogEntry);
			}

			// Track sections by workspace for workspace-specific changelogs (all packages)
			if (!linesSectionsByWorkspace.has(workspace.shortName)) {
				linesSectionsByWorkspace.set(workspace.shortName, new Map());
			}
			const workspaceSections = linesSectionsByWorkspace.get(
				workspace.shortName
			);
			if (workspaceSections) {
				if (!workspaceSections.has(sectionHeader)) {
					workspaceSections.set(sectionHeader, []);
				}
				workspaceSections.get(sectionHeader)?.push(`- ${linkedSubject}`);
			}
		}
	}

	const mainSections = Array.from(linesSectionsByType.entries())
		.map(([header, lines]) => {
			return `### ${header}\n\n${lines.join('\n')}\n`;
		})
		.join('\n');

	return {
		mainSections,
		workspaceSections: linesSectionsByWorkspace,
	};
};

/**
 * Extracts the existing changelog header from a changelog file.
 *
 * Parses an existing CHANGELOG.md file to preserve the header format
 * and styling. Falls back to a default header if the file doesn't exist
 * or doesn't contain a recognizable header.
 *
 * @param changelogPath - path to the changelog file
 * @returns the extracted or default changelog header
 */
const parseExistingChangelogHeader = (changelogPath: string): string => {
	let existingChangelog = '';
	try {
		if (statSync(changelogPath).isFile()) {
			existingChangelog = readFileSync(changelogPath, 'utf-8');
		}
	} catch {
		// File doesn't exist, return default header
	}
	const headerMatch = existingChangelog.match(/# (change ?log) ?\n{1,2}/i);
	return headerMatch ? headerMatch[0] : '# Changelog\n\n';
};

/**
 * Generates a version header for changelog entries.
 *
 * Creates a standardized version header with the current date and a link
 * to the version comparison or release page.
 *
 * @param version - the version number
 * @param versionLink - the URL linking to the version comparison or release
 * @returns formatted version header with date
 *
 * @example
 * ```typescript
 * generateVersionHeader("2.1.0", "https://github.com/user/repo/compare/v2.0.0...v2.1.0");
 * // Returns: "## [2.1.0](https://github.com/user/repo/compare/v2.0.0...v2.1.0) (2024-01-15)\n\n"
 * ```
 */
const generateVersionHeader = (
	version: string,
	versionLink: string
): string => {
	const day = new Date().getDate().toString().padStart(2, '0');
	const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
	const year = new Date().getFullYear();
	return `## [${version}](${versionLink}) (${year}-${month}-${day})\n\n`;
};

/**
 * Updates the root changelog file with new version information.
 *
 * Prepends new changelog content to the existing root CHANGELOG.md file,
 * preserving the existing header and content while adding the new version
 * at the top.
 *
 * @param changelogPath - path to the root changelog file
 * @param version - the version number
 * @param versionLink - the URL linking to the version comparison
 * @param sections - the formatted changelog sections content
 */
const updateRootChangelog = (
	changelogPath: string,
	version: string,
	versionLink: string,
	sections: string
): void => {
	const header = parseExistingChangelogHeader(changelogPath);
	const versionHeader = generateVersionHeader(version, versionLink);
	const newChangelog = `${header}${versionHeader}`;

	let existingChangelog = '';
	try {
		if (statSync(changelogPath).isFile()) {
			existingChangelog = readFileSync(changelogPath, 'utf-8');
		}
	} catch {
		// File doesn't exist, start with empty content
	}

	const changelogContent = `${newChangelog}${sections}\n\n${existingChangelog.replace(header, '')}`;
	writeFileSync(changelogPath, changelogContent, 'utf-8');
};

/**
 * Updates a workspace-specific changelog file.
 *
 * Updates the CHANGELOG.md file within a workspace directory with either
 * specific changes for that workspace or a version bump notification.
 * Only processes workspaces that have existing changelog files.
 *
 * @param workspacePath - path to the workspace directory
 * @param version - the version number
 * @param versionLink - the URL linking to the version comparison
 * @param workspaceSections - optional sections specific to this workspace
 */
const updateWorkspaceChangelog = (
	workspacePath: string,
	version: string,
	versionLink: string,
	workspaceSections: SectionsByType | undefined
): void => {
	const changelogPath = join(workspacePath, 'CHANGELOG.md');
	try {
		if (!statSync(changelogPath).isFile()) {
			return;
		}
	} catch {
		// File doesn't exist
		return;
	}

	const header = parseExistingChangelogHeader(changelogPath);
	const versionHeader = generateVersionHeader(version, versionLink);
	const newChangelog = `${header}${versionHeader}`;

	let changes = '**Note:** Version bump only for this package\n\n';
	if (workspaceSections) {
		const workspaceSectionContent = Array.from(workspaceSections.entries())
			.map(([sectionHeader, lines]) => {
				return `### ${sectionHeader}\n\n${lines.join('\n')}\n`;
			})
			.join('\n');
		changes = workspaceSectionContent;
	}

	const existingChangelog = readFileSync(changelogPath, 'utf-8');
	const changelogContent = `${newChangelog}${changes}${existingChangelog.replace(header, '')}`;
	writeFileSync(changelogPath, changelogContent, 'utf-8');
};

/**
 * Updates all changelog files in the repository.
 *
 * Orchestrates the changelog update process by generating sections from
 * workspace commits and updating both the root changelog and all
 * workspace-specific changelog files. Works for both monorepos and
 * single-package repositories.
 *
 * @param rootPath - the root path of the repository
 * @param workspaces - record of all workspaces with their commits
 * @param version - the new version number
 * @param versionLink - the URL linking to the version comparison
 * @param baseUrl - the base repository URL for generating links
 *
 * @example
 * ```typescript
 * updateChangelogs(
 *   '/path/to/repo',
 *   workspaces,
 *   '2.1.0',
 *   'https://github.com/user/repo/compare/v2.0.0...v2.1.0',
 *   'https://github.com/user/repo'
 * );
 * ```
 */
const updateChangelogs = (
	rootPath: string,
	workspaces: Record<string, Workspace>,
	version: string,
	versionLink: string,
	baseUrl: string
): void => {
	const { mainSections, workspaceSections } = generateChangelogSections(
		workspaces,
		baseUrl
	);

	// Update root changelog
	const rootChangelogPath = join(rootPath, 'CHANGELOG.md');
	updateRootChangelog(rootChangelogPath, version, versionLink, mainSections);

	// Update workspace-specific changelogs
	for (const workspace of Object.values(workspaces)) {
		// Skip workspace changelog if it's the same as root (single-package repo)
		const workspaceChangelogPath = join(workspace.path, 'CHANGELOG.md');
		if (workspaceChangelogPath === rootChangelogPath) {
			continue;
		}

		const workspaceSection = workspaceSections.get(workspace.shortName);
		updateWorkspaceChangelog(
			workspace.path,
			version,
			versionLink,
			workspaceSection
		);
	}
};

export {
	updateChangelogs,
	linkifyCommitReferences,
	generateChangelogSections,
	parseExistingChangelogHeader,
	generateVersionHeader,
	updateRootChangelog,
	updateWorkspaceChangelog,
};
