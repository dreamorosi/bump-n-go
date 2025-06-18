import { relative } from 'node:path';
import { CommitParser } from 'conventional-commits-parser';
import { ChangeTypeMapping } from './constants.js';
import { getChangedFiles, getFileDiff } from './git.js';
import type { RawCommit, Workspace } from './types.js';

const parser = new CommitParser({
	headerPattern: /^(\w*)(?:\(([^)]*)\))?: (.*)$/,
	headerCorrespondence: ['type', 'scope', 'subject'],
	breakingHeaderPattern: /^(\w*)(?:\(([^)]*)\))?!: (.*)$/,
	noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
});

function isAllowedType(type: string): type is keyof typeof ChangeTypeMapping {
	return Object.keys(ChangeTypeMapping).includes(type);
}

function isDependabotGroupCommit(subject: string, scope: string): boolean {
	return scope === 'deps' && /bump the .+ group/.test(subject);
}

function hasProductionDependencyChanges(diff: string): boolean {
	// Look for changes in the "dependencies" section (not devDependencies)
	// Git diff format: lines starting with + or - show additions/removals
	// We need to check if any lines with + or - are within the "dependencies" section

	const lines = diff.split('\n');
	let inDependenciesSection = false;
	let inDevDependenciesSection = false;

	for (const line of lines) {
		// Check for section boundaries
		if (line.includes('"dependencies"') && line.includes(':')) {
			inDependenciesSection = true;
			inDevDependenciesSection = false;
		} else if (line.includes('"devDependencies"') && line.includes(':')) {
			inDependenciesSection = false;
			inDevDependenciesSection = true;
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
			inDevDependenciesSection = false;
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

const parseCommits = (
	commits: RawCommit[],
	workspaces: Record<string, Workspace>,
	rootPath: string
): {
	workspaces: Record<string, Workspace>;
	workspaceChanged: boolean;
} => {
	let workspaceChanged = false;
	for (const commit of commits) {
		const r = parser.parse(`${commit.subject}\n\n${commit.body}`);
		const { subject, type, scope, notes, revert, references, body } = r;

		if (!subject || !type || !scope || !isAllowedType(type)) {
			continue;
		}

		// Find matching package
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
								breaking: notes.some(
									(note) => note.title === 'BREAKING CHANGE'
								),
								hash: commit.hash,
							});
							workspaceChanged = true;
						}
					}
				}
			}
		}
	}

	return {
		workspaces,
		workspaceChanged,
	};
};

export { 
	parseCommits, 
	isAllowedType, 
	isDependabotGroupCommit, 
	hasProductionDependencyChanges, 
	getAffectedWorkspacesFromChangedFiles 
};
