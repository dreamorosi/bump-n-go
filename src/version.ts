import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Workspace } from './types.js';

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

const updateWorkspacePackageJson = (
	workspace: Workspace,
	newVersion: string,
	allWorkspaces: Record<string, Workspace>
): void => {
	const pkgPath = join(workspace.path, 'package.json');
	if (!existsSync(pkgPath)) return;

	const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

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

	// Write back with proper formatting
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, '\t')}\n`, 'utf-8');
};

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

export { bumpVersions, preserveVersionRange };
