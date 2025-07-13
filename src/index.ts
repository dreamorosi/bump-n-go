import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inc, parse, type SemVer } from 'semver';
import { determineVersionBumpType } from './bump.js';
import { updateChangelogs } from './changelog.js';
import { parseCommits } from './commits.js';
import { TypeHierarchy } from './constants.js';
import { getCommitsSinceTag, getFirstCommit, getLastTag } from './git.js';
import { configureLogger, logger } from './logger.js';
import type { BumpType } from './types.js';
import { bumpVersions } from './version.js';
import { readWorkspaces } from './workspace.js';

// Suppress experimental warning about globSync to reduce noise, can be removed once Node.js makes it stable
/* c8 ignore start */
process.removeAllListeners('warning').on('warning', (err) => {
	if (err.name !== 'ExperimentalWarning' && !err.message.includes('globSync')) {
		console.warn(err);
	}
});
/* c8 ignore stop */

/**
 * Main function that processes a repository for changelog generation and version bumping.
 *
 * Orchestrates the entire release process by:
 * 1. Analyzing git history since the last tag (or all history if no tags exist)
 * 2. Parsing conventional commits and mapping them to workspaces
 * 3. Determining the appropriate semantic version bump
 * 4. Generating changelogs for root and workspace-specific files
 * 5. Updating package versions across all workspaces
 *
 * Supports both monorepos with multiple workspaces and single-package repositories.
 * For single-package repos, treats the root package as the sole workspace.
 *
 * @param options - configuration options for the repository processing
 * @param options.root - the root directory of the repository
 * @param options.dryRun - when true, shows what would be done without making changes
 * @param options.type - optional override for version bump type (major, minor, patch)
 * @param options.verbose - enables detailed debug logging
 *
 * @example
 * ```typescript
 * // Process a monorepo
 * await processMonorepo({
 *   root: '/path/to/monorepo',
 *   dryRun: false,
 *   verbose: true
 * });
 * 
 * // Process a single-package repo
 * await processMonorepo({
 *   root: '/path/to/single-package',
 *   dryRun: true
 * });
 * ```
 */
const processMonorepo = async (options: {
	root: string;
	dryRun?: boolean;
	type?: string;
	verbose?: boolean;
}): Promise<void> => {
	const { root, dryRun = false, type, verbose = false } = options;
	configureLogger(verbose);

	if (type && !Object.keys(TypeHierarchy).includes(type)) {
		logger.error(
			`Invalid type provided: ${type}. Valid types are: ${Object.keys(
				TypeHierarchy
			).join(', ')}`
		);
		return;
	}

	// Get the last tag
	const lastTag = getLastTag(root);
	logger.debug(`Last tag: ${lastTag}`);

	// Get commits since the last tag or since the beginning
	const commits = getCommitsSinceTag(root, lastTag);
	logger.debug(`Found ${commits.length} commits`);

	// Get workspaces
	const workspaces = readWorkspaces(root);
	logger.debug(`Found ${Object.keys(workspaces).length} workspaces`);

	// Parse commits and map to workspaces
	const { workspaceChanged, workspaces: workspacesWithCommits } = parseCommits(
		commits,
		workspaces,
		root
	);

	if (!workspaceChanged && !type) {
		logger.info(
			'No changes detected in workspaces and no version bump type provided; skipping version bump'
		);
		return;
	}

	// TODO: release drafter output could be generated here

	let bumpType: BumpType;
	// If a version bump type is provided, use it
	if (type) {
		bumpType = type as BumpType;
		logger.info(`Version bump type provided: ${bumpType}`);
	} else {
		// Otherwise, determine the version bump type based on parsed commits
		let maxBumpType = 'patch' as BumpType;
		for (const workspace of Object.values(workspacesWithCommits)) {
			if (!workspace.changed) {
				continue;
			}
			const bumpType = determineVersionBumpType(workspace.commits);
			if (TypeHierarchy[bumpType] > TypeHierarchy[maxBumpType]) {
				maxBumpType = bumpType;
			}
		}
		logger.info(`Determined version bump type: ${maxBumpType}`);
		bumpType = maxBumpType;
	}

	// Parse current version and check if it's a prerelease
	let currentVersion: SemVer;
	if (lastTag) {
		// Use git tag version if available
		currentVersion = parse(lastTag) as SemVer;
	} else {
		// Fall back to package.json version when no tags exist
		const rootPkgPath = join(root, 'package.json');
		const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
		const pkgVersion = rootPkg.version || '0.0.0';
		currentVersion = parse(pkgVersion) || (parse('0.0.0') as SemVer);
		logger.debug(`Using package.json version as baseline: ${pkgVersion}`);
	}
	
	const isPrerelease = currentVersion.prerelease.length > 0;

	let newVersion: string | null;
	if (isPrerelease) {
		// Preserve prerelease identifier (e.g., "alpha", "beta")
		const prereleaseId = currentVersion.prerelease[0] as string;
		const prereleaseMap = {
			major: 'premajor',
			minor: 'preminor',
			patch: 'prepatch',
		} as const;
		newVersion = inc(
			currentVersion,
			prereleaseMap[bumpType],
			prereleaseId,
			false
		);
	} else {
		newVersion = inc(currentVersion, bumpType, false);
	}
	/* c8 ignore start */
	if (!newVersion) {
		logger.error('Failed to generate new version');
		return;
	}
	/* c8 ignore stop */
	logger.info(`New version: ${newVersion}`);

	if (dryRun) {
		logger.info('Dry run enabled, no changes will be made');
		return;
	}

	// Get repository information for changelog links
	const rootPkgPath = join(root, 'package.json');
	const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
	const repoUrl = rootPkg.repository?.url || '';
	const baseUrl = repoUrl.replace(/^git\+|\.git$/g, '');

	// Generate version comparison link
	let versionLink: string;
	if (lastTag) {
		versionLink = `${baseUrl}/compare/${lastTag}...v${newVersion}`;
	} else {
		const firstCommit = getFirstCommit(root);
		versionLink = firstCommit
			? `${baseUrl}/compare/${firstCommit}...v${newVersion}`
			: `${baseUrl}/releases/tag/v${newVersion}`;
	}

	// Update changelogs
	updateChangelogs(
		root,
		workspacesWithCommits,
		newVersion,
		versionLink,
		baseUrl
	);
	logger.info('Updated changelogs');

	// Bump package versions
	bumpVersions(root, workspacesWithCommits, newVersion);
	logger.info(`Bumped all package versions to ${newVersion}`);
};

export { processMonorepo };
