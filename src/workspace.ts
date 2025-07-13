import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Workspace } from './types.js';

/**
 * Reads and parses all workspaces defined in the root package.json.
 *
 * Discovers workspaces using npm workspaces configuration, reads each
 * workspace's package.json, and extracts relevant metadata including
 * dependencies, version, and privacy settings. If no workspaces are
 * defined, treats the root package as a single workspace.
 *
 * @param root - the root directory of the monorepo or single-package repo
 * @returns record of workspace data keyed by short name
 *
 * @example
 * ```typescript
 * const workspaces = readWorkspaces('/path/to/monorepo');
 * // Returns: { 'my-package': { name: '@scope/my-package', version: '1.0.0', ... } }
 * ```
 */
const readWorkspaces = (root: string): Record<string, Workspace> => {
	// Read root package.json to get workspaces definition
	const rootPkgPath = join(root, 'package.json');
	const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));

	const workspaces = rootPkg.workspaces || [];
	let patterns: string[] = [];

	// Handle both array format and object format for workspaces
	if (Array.isArray(workspaces)) {
		patterns = workspaces;
	} else if (workspaces.packages) {
		patterns = workspaces.packages;
	}

	const packageDirs: string[] = [];

	// Find all matching package directories using glob patterns
	for (const pattern of patterns) {
		const matches = globSync(pattern, { cwd: root });
		packageDirs.push(...matches);
	}

	// Read package.json from each directory and build workspace data
	const workspacesData: Record<string, Workspace> = {};
	for (const dir of packageDirs) {
		const pkgPath = join(root, dir, 'package.json');
		if (existsSync(pkgPath)) {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			const pkgName = pkg.name || dir;
			const shortName = pkgName.split('/').pop(); // Extract name from @scope/name format
			const dependencyNames = Object.keys(pkg.dependencies || {});
			const isPrivate = pkg.private || false;

			workspacesData[shortName] = {
				name: pkg.name,
				shortName: shortName,
				path: join(root, dir),
				version: pkg.version,
				changed: false,
				commits: [],
				dependencyNames,
				isPrivate,
			};
		}
	}

	// If no workspaces were found, treat the root package as a single workspace
	if (Object.keys(workspacesData).length === 0) {
		const pkgName = rootPkg.name || 'root';
		const shortName = pkgName.split('/').pop(); // Extract name from @scope/name format
		const dependencyNames = Object.keys(rootPkg.dependencies || {});
		const isPrivate = rootPkg.private || false;

		workspacesData[shortName] = {
			name: rootPkg.name,
			shortName: shortName,
			path: root,
			version: rootPkg.version,
			changed: false,
			commits: [],
			dependencyNames,
			isPrivate,
		};
	}

	return workspacesData;
};

export { readWorkspaces };
