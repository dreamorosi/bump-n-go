import { ChangeTypeMapping } from './constants.js';
import type { BumpType, ParsedCommit } from './types.js';

const determineVersionBumpType = (parsedCommits: ParsedCommit[]) => {
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
