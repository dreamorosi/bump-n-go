import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Workspace } from './types.js';

/**
 * Detects the indentation style and trailing newline from original file content.
 *
 * Analyzes the original JSON file content to determine whether it uses tabs
 * or spaces for indentation, how many spaces if using spaces, and whether
 * there's a trailing newline.
 *
 * @param originalContent - the original file content as a string
 * @returns object containing indent string and whether to add trailing newline
 */
const detectFormatting = (
	originalContent: string
): { indent: string; hasTrailingNewline: boolean } => {
	// Check for trailing newline
	const hasTrailingNewline = originalContent.endsWith('\n');

	// Look for the first indented line to detect indentation style
	const lines = originalContent.split('\n');
	for (const line of lines) {
		if (line.length > 0 && (line.startsWith('\t') || line.startsWith(' '))) {
			// Found an indented line, analyze its indentation
			const match = line.match(/^(\s+)/);
			if (match?.[1]) {
				const indent = match[1];
				return { indent, hasTrailingNewline };
			}
		}
	}

	// Default to tabs with trailing newline if no indentation detected (fallback for unformatted JSON)
	return { indent: '\t', hasTrailingNewline: true };
};

/**
 * Preserves version range operators when updating dependency versions.
 *
 * Extracts and maintains the semantic version range operator (^, ~, >=, etc.)
 * from the current version range and applies it to the new version.
 *
 * @param currentRange - the current version range (e.g., "^1.0.0", "~2.1.0")
 * @param newVersion - the new version to apply the range to
 * @returns the new version with the preserved range operator
 *
 * @example
 * ```typescript
 * preserveVersionRange("^1.0.0", "2.1.0") // Returns "^2.1.0"
 * preserveVersionRange("~1.5.0", "2.1.0") // Returns "~2.1.0"
 * preserveVersionRange(">=1.0.0", "2.1.0") // Returns ">=2.1.0"
 * ```
 */
const preserveVersionRange = (
	currentRange: string,
	newVersion: string
): string => {
	// Extract the operator prefix (^, ~, >=, etc.) and preserve it
	const operatorMatch = currentRange.match(/^(\^|~|>=|>|<=|<|=)?(.+)$/);
	if (!operatorMatch) return newVersion;

	const [, operator = ''] = operatorMatch;
	return `${operator}${newVersion}`;
};

/**
 * Updates a workspace's package.json file with new version and dependency versions.
 *
 * Updates the package version and any intra-project dependencies to maintain
 * consistency across the repository. Preserves version range operators and
 * skips local file references. Works for both monorepo workspaces and
 * single-package repositories.
 *
 * @param workspace - the workspace to update
 * @param newVersion - the new version to set
 * @param allWorkspaces - record of all workspaces for dependency resolution
 */
const updateWorkspacePackageJson = (
	workspace: Workspace,
	newVersion: string,
	allWorkspaces: Record<string, Workspace>
): void => {
	const pkgPath = join(workspace.path, 'package.json');
	if (!existsSync(pkgPath)) return;

	const originalContent = readFileSync(pkgPath, 'utf-8');
	const pkg = JSON.parse(originalContent);

	// Detect original formatting
	const { indent, hasTrailingNewline } = detectFormatting(originalContent);

	// Update the package version
	pkg.version = newVersion;

	// Update intra-project dependencies
	const dependencyTypes = [
		'dependencies',
		'devDependencies',
		'peerDependencies',
	] as const;

	for (const depType of dependencyTypes) {
		if (!pkg[depType]) continue;

		for (const [depName, currentRange] of Object.entries(pkg[depType])) {
			// Skip file: dependencies (local file references)
			if (
				typeof currentRange === 'string' &&
				currentRange.startsWith('file:')
			) {
				continue;
			}

			// Check if this dependency is one of our workspace packages
			const matchingWorkspace = Object.values(allWorkspaces).find(
				(ws) => ws.name === depName
			);

			if (matchingWorkspace && typeof currentRange === 'string') {
				pkg[depType][depName] = preserveVersionRange(currentRange, newVersion);
			}
		}
	}

	// Write back with preserved formatting
	const jsonContent = JSON.stringify(pkg, null, indent);
	const finalContent = hasTrailingNewline ? `${jsonContent}\n` : jsonContent;
	writeFileSync(pkgPath, finalContent, 'utf-8');
};

/**
 * Updates the package-lock.json file with new workspace versions.
 *
 * Scans the lockfile for workspace packages and updates their version
 * references to maintain consistency with the new version.
 *
 * @param rootPath - the root path of the monorepo
 * @param newVersion - the new version to set
 * @param allWorkspaces - record of all workspaces for name resolution
 */
const updatePackageLock = (
	rootPath: string,
	newVersion: string,
	allWorkspaces: Record<string, Workspace>
): void => {
	const lockPath = join(rootPath, 'package-lock.json');
	if (!existsSync(lockPath)) return;

	const lockfile = JSON.parse(readFileSync(lockPath, 'utf-8'));
	let updated = false;

	// Create a set of workspace names for faster lookup
	const workspaceNames = new Set(
		Object.values(allWorkspaces).map((ws) => ws.name)
	);

	// Update package references in the lockfile
	if (lockfile.packages) {
		for (const [pkgPath, pkgInfo] of Object.entries(lockfile.packages)) {
			if (typeof pkgInfo !== 'object' || !pkgInfo || !('name' in pkgInfo))
				continue;

			const packageName = (pkgInfo as { name: string }).name;

			// Skip root package (empty string path)
			if (pkgPath === '') continue;

			// Check if this package is one of our workspaces by name
			if (workspaceNames.has(packageName) && 'version' in pkgInfo) {
				(pkgInfo as { version: string }).version = newVersion;
				updated = true;
			}
		}
	}

	// Only write if we made updates
	if (updated) {
		writeFileSync(lockPath, `${JSON.stringify(lockfile, null, 2)}\n`, 'utf-8');
	}
};

/**
 * Bumps versions across all workspace packages and updates the lockfile.
 *
 * Orchestrates the version update process by updating all workspace
 * package.json files and the root package-lock.json file to maintain
 * consistency across the repository. Works for both monorepos and
 * single-package repositories.
 *
 * @param rootPath - the root path of the repository
 * @param workspaces - record of all workspaces to update
 * @param newVersion - the new version to set across all packages
 *
 * @example
 * ```typescript
 * bumpVersions('/path/to/repo', workspaces, '2.1.0');
 * ```
 */
const bumpVersions = (
	rootPath: string,
	workspaces: Record<string, Workspace>,
	newVersion: string
): void => {
	// Update all workspace package.json files
	for (const workspace of Object.values(workspaces)) {
		updateWorkspacePackageJson(workspace, newVersion, workspaces);
	}

	// Update package-lock.json
	updatePackageLock(rootPath, newVersion, workspaces);
};

export {
	bumpVersions,
	detectFormatting,
	preserveVersionRange,
	updateWorkspacePackageJson,
	updatePackageLock,
};
