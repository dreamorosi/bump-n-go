import { ChangeTypeMapping } from './constants.js';
import type { BumpType, ParsedCommit } from './types.js';

/**
 * Determines the appropriate semantic version bump type based on parsed commits.
 *
 * Analyzes commits to determine whether a major, minor, or patch version bump
 * is required according to semantic versioning rules:
 * - Major: breaking changes detected
 * - Minor: new features added (feat, feature, improv)
 * - Patch: bug fixes and other changes
 *
 * @param parsedCommits - array of parsed conventional commits to analyze
 * @returns the appropriate version bump type
 *
 * @example
 * ```typescript
 * const commits = [
 *   { type: 'feat', breaking: false, ... },
 *   { type: 'fix', breaking: false, ... }
 * ];
 * const bumpType = determineVersionBumpType(commits); // 'minor'
 * ```
 */
const determineVersionBumpType = (parsedCommits: ParsedCommit[]): BumpType => {
	// If there are any breaking changes, it's a major bump
	if (parsedCommits.some((commit) => commit.breaking)) {
		return 'major';
	}

	// Default to patch if no relevant commits are found
	let bumpType: BumpType = 'patch';

	for (const commit of parsedCommits) {
		// Upgrade bump type if needed (minor > patch)
		if (ChangeTypeMapping[commit.type] === 'minor') {
			bumpType = 'minor';
			break;
		}
	}

	return bumpType;
};

export { determineVersionBumpType };
