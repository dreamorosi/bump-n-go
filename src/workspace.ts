import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Workspace } from './types.js';

const readWorkspaces = (root: string): Record<string, Workspace> => {
	// Read root package.json to get workspaces definition
	const rootPkgPath = join(root, 'package.json');
	const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));

	const workspaces = rootPkg.workspaces || [];
	let patterns: string[] = [];

	if (Array.isArray(workspaces)) {
		patterns = workspaces;
	} else if (workspaces.packages) {
		patterns = workspaces.packages;
	}

	const packageDirs: string[] = [];

	// Find all matching package directories
	for (const pattern of patterns) {
		const matches = globSync(pattern, { cwd: root });
		packageDirs.push(...matches);
	}

	// Read package.json from each directory
	const workspacesData: Record<string, Workspace> = {};
	for (const dir of packageDirs) {
		const pkgPath = join(root, dir, 'package.json');
		if (existsSync(pkgPath)) {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			const pkgName = pkg.name || dir;
			const shortName = pkgName.split('/').pop(); // For @scope/name format
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

	return workspacesData;
};

export { readWorkspaces };
