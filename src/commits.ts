import { relative } from 'node:path';
import { CommitParser } from 'conventional-commits-parser';
import { ChangeTypeMapping } from './constants.js';
import { getChangedFiles, getFileDiff } from './git.js';
import type { RawCommit, Workspace } from './types.js';

/**
 * Parser instance for conventional commits.
 *
 * Configured to parse commit messages according to conventional commit format
 * with support for breaking changes and scoped commits.
 */
const parser = new CommitParser({
	headerPattern: /^(\w*)(?:\(([^)]*)\))?: (.*)$/,
	headerCorrespondence: ['type', 'scope', 'subject'],
	breakingHeaderPattern: /^(\w*)(?:\(([^)]*)\))?!: (.*)$/,
	noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
});

/**
 * Checks if a commit type is valid according to the change type mapping.
 *
 * @param type - the commit type to validate
 * @returns true if the type is allowed, false otherwise
 */
function isAllowedType(type: string): type is keyof typeof ChangeTypeMapping {
	return Object.keys(ChangeTypeMapping).includes(type);
}

/**
 * Determines if a commit is a Dependabot group commit.
 *
 * Group commits are special dependency update commits that affect multiple
 * packages at once and need special handling for workspace detection.
 *
 * @param subject - the commit subject line
 * @param scope - the commit scope
 * @returns true if this is a Dependabot group commit
 */
function isDependabotGroupCommit(subject: string, scope: string): boolean {
	return scope === 'deps' && /bump the .+ group/.test(subject);
}

/**
 * Analyzes a git diff to determine if production dependencies were changed.
 *
 * Parses the diff output to check if changes occurred within the "dependencies"
 * section of a package.json file, excluding devDependencies and other sections.
 *
 * @param diff - the git diff output to analyze
 * @returns true if production dependencies were modified
 */
function hasProductionDependencyChanges(diff: string): boolean {
	// Look for changes in the "dependencies" section (not devDependencies)
	// Git diff format: lines starting with + or - show additions/removals
	// We need to check if any lines with + or - are within the "dependencies" section

	const lines = diff.split('\n');
	let inDependenciesSection = false;

	for (const line of lines) {
		// Check for section boundaries
		if (line.includes('"dependencies"') && line.includes(':')) {
			inDependenciesSection = true;
		} else if (line.includes('"devDependencies"') && line.includes(':')) {
			inDependenciesSection = false;
		} else if (
			line.includes('"peerDependencies"') ||
			line.includes('"optionalDependencies"') ||
			line.includes('"scripts"') ||
			line.includes('"engines"') ||
			line.includes('"repository"') ||
			line.includes('"keywords"') ||
			line.includes('"author"') ||
			line.includes('"license"') ||
			line.includes('"bugs"') ||
			line.includes('"homepage"') ||
			line.includes('"main"') ||
			line.includes('"module"') ||
			line.includes('"types"') ||
			line.includes('"bin"') ||
			line.includes('"files"') ||
			line.includes('"workspaces"') ||
			line.includes('"private"') ||
			line.includes('"name"') ||
			line.includes('"version"') ||
			line.includes('"description"')
		) {
			// Reset when we hit other top-level sections
			inDependenciesSection = false;
		}

		// If we're in the dependencies section and see a change (+ or -)
		if (
			inDependenciesSection &&
			(line.startsWith('+') || line.startsWith('-'))
		) {
			// Ignore the section header line itself
			if (!line.includes('"dependencies"')) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Identifies workspaces affected by changes to package.json files.
 *
 * Analyzes changed files from a commit to determine which workspaces
 * had their production dependencies modified. Used primarily for
 * Dependabot group commits that affect multiple packages.
 *
 * @param changedFiles - array of file paths that were changed in the commit
 * @param workspaces - record of all workspaces in the monorepo
 * @param rootPath - the root path of the monorepo
 * @param commitHash - the commit hash for getting file diffs
 * @returns array of workspaces that had production dependency changes
 */
function getAffectedWorkspacesFromChangedFiles(
	changedFiles: string[],
	workspaces: Record<string, Workspace>,
	rootPath: string,
	commitHash: string
): Workspace[] {
	const affectedWorkspaces: Workspace[] = [];

	// Filter for package.json files only
	const packageJsonFiles = changedFiles.filter((file) =>
		file.endsWith('package.json')
	);

	for (const file of packageJsonFiles) {
		// Skip root package.json
		if (file === 'package.json') continue;

		// Find workspace that matches this file path
		for (const workspace of Object.values(workspaces)) {
			// Convert absolute workspace path to relative path from root
			const workspaceRelativePath = relative(rootPath, workspace.path);
			if (file.startsWith(`${workspaceRelativePath}/`)) {
				// Skip private workspaces to avoid unnecessary diff operations
				if (workspace.isPrivate) {
					break;
				}

				// Get the diff for this specific package.json file
				const diff = getFileDiff(rootPath, commitHash, file);

				// Only include workspace if production dependencies were changed
				if (hasProductionDependencyChanges(diff)) {
					affectedWorkspaces.push(workspace);
				}
				break;
			}
		}
	}

	return affectedWorkspaces;
}

/**
 * Parses raw commits and associates them with affected workspaces.
 *
 * Processes conventional commits to extract metadata and determine which
 * workspaces are affected by each commit. Handles both direct workspace
 * commits (scoped to a specific package) and dependency updates. For
 * single-package repos (where root package is the only workspace), assigns 
 * all valid commits to the root workspace.
 *
 * @param commits - array of raw commit data from git
 * @param workspaces - record of all workspaces in the monorepo
 * @param rootPath - the root path of the monorepo
 * @returns object containing updated workspaces and change detection flag
 *
 * @example
 * ```typescript
 * const { workspaces, workspaceChanged } = parseCommits(
 *   rawCommits,
 *   workspaceData,
 *   '/path/to/repo'
 * );
 * ```
 */
const parseCommits = (
	commits: RawCommit[],
	workspaces: Record<string, Workspace>,
	rootPath: string
): {
	workspaces: Record<string, Workspace>;
	workspaceChanged: boolean;
} => {
	let workspaceChanged = false;
	
	// Check if this is a single-package repo (root package is the only workspace)
	const workspaceEntries = Object.values(workspaces);
	const isSinglePackageRepo = workspaceEntries.length === 1 && 
		workspaceEntries[0]?.path === rootPath;
	const rootWorkspace = isSinglePackageRepo ? workspaceEntries[0] : null;

	for (const commit of commits) {
		const r = parser.parse(`${commit.subject}\n\n${commit.body}`);
		const { subject, type, scope, notes } = r;

		if (!subject || !type || !isAllowedType(type)) {
			continue;
		}

		// For single-package repos, assign all valid commits to the root workspace
		if (isSinglePackageRepo && rootWorkspace) {
			rootWorkspace.changed = true;
			rootWorkspace.commits.push({
				subject,
				type,
				scope: scope || rootWorkspace.shortName,
				notes,
				breaking: notes.some((note) => note.title === 'BREAKING CHANGE'),
				hash: commit.hash,
			});
			workspaceChanged = true;
			continue;
		}

		// For multi-package repos, require scope to match workspace
		if (!scope) {
			continue;
		}

		// Find matching package for scoped commits
		const pkg = workspaces[scope];
		if (pkg) {
			pkg.changed = true;
			pkg.commits.push({
				subject,
				type,
				scope,
				notes,
				breaking: notes.some((note) => note.title === 'BREAKING CHANGE'),
				hash: commit.hash,
			});

			workspaceChanged = true;
		}

		// Handle dependency updates
		if (scope === 'deps') {
			if (isDependabotGroupCommit(subject, scope) && commit.hash) {
				// Handle group commits using git diff analysis
				const changedFiles = getChangedFiles(rootPath, commit.hash);
				const affectedWorkspaces = getAffectedWorkspacesFromChangedFiles(
					changedFiles,
					workspaces,
					rootPath,
					commit.hash
				);

				for (const workspace of affectedWorkspaces) {
					if (!workspace.isPrivate) {
						workspace.changed = true;
						workspace.commits.push({
							subject,
							type,
							scope,
							notes,
							breaking: notes.some((note) => note.title === 'BREAKING CHANGE'),
							hash: commit.hash,
						});
						workspaceChanged = true;
					}
				}
			} else {
				// Handle individual dependency updates (existing logic)
				for (const pkg of Object.values(workspaces)) {
					if (pkg.isPrivate) continue;
					for (const depName of pkg.dependencyNames) {
						if (subject.includes(depName) && !pkg.isPrivate) {
							pkg.changed = true;
							pkg.commits.push({
								subject,
								type,
								scope,
								notes,
								breaking: notes.some((note) => note.title === 'BREAKING CHANGE'),
								hash: commit.hash,
							});
							workspaceChanged = true;
							break;
						}
					}
				}
			}
		}
	}

	return { workspaces, workspaceChanged };
};

export {
	parseCommits,
	isAllowedType,
	isDependabotGroupCommit,
	hasProductionDependencyChanges,
	getAffectedWorkspacesFromChangedFiles,
};
