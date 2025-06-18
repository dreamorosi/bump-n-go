import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ChangeTypeHeaderMapping } from './constants.js';
import type {
	ChangelogSections,
	SectionsByType,
	SectionsByWorkspace,
	Workspace,
} from './types.js';

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

const generateChangelogSections = (
	workspaces: Record<string, Workspace>,
	baseUrl: string
): ChangelogSections => {
	const linesSectionsByType: SectionsByType = new Map();
	const linesSectionsByWorkspace: SectionsByWorkspace = new Map();

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
				linesSectionsByType
					.get(sectionHeader)
					?.push(`- **${workspace.shortName}** ${linkedSubject}`);
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

const generateVersionHeader = (
	version: string,
	versionLink: string
): string => {
	const day = new Date().getDate().toString().padStart(2, '0');
	const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
	const year = new Date().getFullYear();
	return `## [${version}](${versionLink}) (${year}-${month}-${day})\n\n`;
};

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
	updateWorkspaceChangelog
};
