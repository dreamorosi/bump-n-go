import { describe, expect, it } from 'vitest';
import { isVersionBumpCommit } from '../../src/commits.js';

describe('isVersionBumpCommit', () => {
	// Valid version bump commits
	it.each([
		{ type: 'chore', subject: 'bump version to 1.0.0' },
		{ type: 'chore', subject: 'bump version' },
		{ type: 'chore', subject: '  bump version to 2.0.0  ' }, // with whitespace
	])('identifies valid version bump commit: $subject', ({ type, subject }) => {
		expect(isVersionBumpCommit(type, subject)).toBe(true);
	});

	// Non-version bump commits
	it.each([
		{ type: 'feat', subject: 'bump version' }, // wrong type
		{ type: 'chore', subject: 'update version' }, // different wording
		{ type: 'chore', subject: 'bumping version' }, // different form
		{ type: 'chore', subject: 'version bump' }, // reversed wording
		{ type: 'chore', subject: 'other change' },
	])('rejects non-version bump commits: $type $subject', ({ type, subject }) => {
		expect(isVersionBumpCommit(type, subject)).toBe(false);
	});
});