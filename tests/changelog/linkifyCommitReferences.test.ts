import { expect, it } from 'vitest';
import { linkifyCommitReferences } from '../../src/changelog.js';

it('returns subject unchanged when no baseUrl provided', () => {
	// Prepare
	const subject = 'Add new feature with #123';
	const baseUrl = '';
	const commitHash = 'abc1234567890def';

	// Act
	const result = linkifyCommitReferences(subject, baseUrl, commitHash);

	// Assess
	expect(result).toBe(subject);
});

it('converts GitHub issue references to links', () => {
	// Prepare
	const subject = 'Fix bug #123 and close #456';
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = linkifyCommitReferences(subject, baseUrl);

	// Assess
	expect(result).toBe(
		'Fix bug [#123](https://github.com/user/repo/issues/123) and close [#456](https://github.com/user/repo/issues/456)'
	);
});

it('adds commit hash link when provided', () => {
	// Prepare
	const subject = 'Add new feature';
	const baseUrl = 'https://github.com/user/repo';
	const commitHash = 'abc1234567890def';

	// Act
	const result = linkifyCommitReferences(subject, baseUrl, commitHash);

	// Assess
	expect(result).toBe(
		'Add new feature ([abc1234](https://github.com/user/repo/commit/abc1234567890def))'
	);
});

it('handles both issue references and commit hash', () => {
	// Prepare
	const subject = 'Fix issue #123';
	const baseUrl = 'https://github.com/user/repo';
	const commitHash = 'abc1234567890def';

	// Act
	const result = linkifyCommitReferences(subject, baseUrl, commitHash);

	// Assess
	expect(result).toBe(
		'Fix issue [#123](https://github.com/user/repo/issues/123) ([abc1234](https://github.com/user/repo/commit/abc1234567890def))'
	);
});

it('handles multiple issue references', () => {
	// Prepare
	const subject = 'Related to #100, #200, and #300';
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = linkifyCommitReferences(subject, baseUrl);

	// Assess
	expect(result).toBe(
		'Related to [#100](https://github.com/user/repo/issues/100), [#200](https://github.com/user/repo/issues/200), and [#300](https://github.com/user/repo/issues/300)'
	);
});

it('handles subject with no issue references', () => {
	// Prepare
	const subject = 'Simple commit message';
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = linkifyCommitReferences(subject, baseUrl);

	// Assess
	expect(result).toBe('Simple commit message');
});

it('handles short commit hash correctly', () => {
	// Prepare
	const subject = 'Short commit';
	const baseUrl = 'https://github.com/user/repo';
	const commitHash = 'abc123';

	// Act
	const result = linkifyCommitReferences(subject, baseUrl, commitHash);

	// Assess
	expect(result).toBe(
		'Short commit ([abc123](https://github.com/user/repo/commit/abc123))'
	);
});
