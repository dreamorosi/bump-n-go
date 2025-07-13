import { beforeEach, expect, it, vi } from 'vitest';
import { getCommitsSinceTag } from '../../src/git.js';

const mocks = vi.hoisted(() => ({
	execSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
	execSync: mocks.execSync,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('parses commits correctly with tag', () => {
	// Prepare
	const mockOutput =
		'abc123\nfeat: add new feature\nDetailed description\nof the feature\n==END==\ndef456\nfix: bug fix\nBug description\n==END==\n';
	mocks.execSync.mockReturnValue(Buffer.from(mockOutput));

	// Act
	const result = getCommitsSinceTag('/test/path', 'v1.0.0');

	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith(
		'git log v1.0.0..HEAD --pretty=format:"%H%n%s%n%b%n==END=="',
		{ cwd: '/test/path' }
	);
	expect(result).toEqual([
		{
			hash: 'abc123',
			subject: 'feat: add new feature',
			body: 'Detailed description\nof the feature',
		},
		{
			hash: 'def456',
			subject: 'fix: bug fix',
			body: 'Bug description',
		},
	]);
});

it('parses commits correctly without tag (all commits)', () => {
	// Prepare
	const mockOutput = 'abc123\nfeat: initial commit\nFirst commit\n==END==\n';
	mocks.execSync.mockReturnValue(Buffer.from(mockOutput));

	// Act
	const result = getCommitsSinceTag('/test/path', null);

	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith(
		'git log  --pretty=format:"%H%n%s%n%b%n==END=="',
		{ cwd: '/test/path' }
	);
	expect(result).toEqual([
		{
			hash: 'abc123',
			subject: 'feat: initial commit',
			body: 'First commit',
		},
	]);
});

it('handles commits with no body', () => {
	// Prepare
	const mockOutput = 'abc123\nfeat: simple commit\n\n==END==\n';
	mocks.execSync.mockReturnValue(Buffer.from(mockOutput));

	// Act
	const result = getCommitsSinceTag('/test/path', 'v1.0.0');

	// Assess
	expect(result).toEqual([
		{
			hash: 'abc123',
			subject: 'feat: simple commit',
			body: '',
		},
	]);
});

it('handles commits with multiline body', () => {
	// Prepare
	const mockOutput =
		'abc123\nfeat: complex feature\n\nThis is a detailed\nmultiline description\n\nwith multiple paragraphs\n==END==\n';
	mocks.execSync.mockReturnValue(Buffer.from(mockOutput));

	// Act
	const result = getCommitsSinceTag('/test/path', 'v1.0.0');

	// Assess
	expect(result).toEqual([
		{
			hash: 'abc123',
			subject: 'feat: complex feature',
			body: 'This is a detailed\nmultiline description\n\nwith multiple paragraphs',
		},
	]);
});

it('filters out empty chunks', () => {
	// Prepare
	const mockOutput =
		'abc123\nfeat: commit\nbody\n==END==\n\n==END==\ndef456\nfix: another\nbody2\n==END==\n';
	mocks.execSync.mockReturnValue(Buffer.from(mockOutput));

	// Act
	const result = getCommitsSinceTag('/test/path', 'v1.0.0');

	// Assess
	expect(result).toEqual([
		{
			hash: 'abc123',
			subject: 'feat: commit',
			body: 'body',
		},
		{
			hash: 'def456',
			subject: 'fix: another',
			body: 'body2',
		},
	]);
});

it('handles empty git log output', () => {
	// Prepare
	mocks.execSync.mockReturnValue(Buffer.from(''));

	// Act
	const result = getCommitsSinceTag('/test/path', 'v1.0.0');

	// Assess
	expect(result).toEqual([]);
});

it('handles commits with empty subjects', () => {
	// Prepare
	const mockOutput = 'abc123\n\nEmpty subject commit\n==END==\n';
	mocks.execSync.mockReturnValue(Buffer.from(mockOutput));

	// Act
	const result = getCommitsSinceTag('/test/path', 'v1.0.0');

	// Assess
	expect(result).toEqual([
		{
			hash: 'abc123',
			subject: '',
			body: 'Empty subject commit',
		},
	]);
});

it('returns empty array when git command fails with tag', () => {
	// Prepare
	mocks.execSync.mockImplementation(() => {
		throw new Error('Git command failed');
	});

	// Act
	const result = getCommitsSinceTag('/test/path', 'v1.0.0');

	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith(
		'git log v1.0.0..HEAD --pretty=format:"%H%n%s%n%b%n==END=="',
		{ cwd: '/test/path' }
	);
	expect(result).toEqual([]);
});

it('returns empty array when git command fails without tag', () => {
	// Prepare
	mocks.execSync.mockImplementation(() => {
		throw new Error('Git command failed');
	});

	// Act
	const result = getCommitsSinceTag('/test/path', null);

	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith(
		'git log  --pretty=format:"%H%n%s%n%b%n==END=="',
		{ cwd: '/test/path' }
	);
	expect(result).toEqual([]);
});

it('handles non-Error exceptions with tag', () => {
	// Prepare
	mocks.execSync.mockImplementation(() => {
		throw 'String error';
	});

	// Act
	const result = getCommitsSinceTag('/test/path', 'v1.0.0');

	// Assess
	expect(result).toEqual([]);
});

it('handles non-Error exceptions without tag', () => {
	// Prepare
	mocks.execSync.mockImplementation(() => {
		throw 'String error';
	});

	// Act
	const result = getCommitsSinceTag('/test/path', null);

	// Assess
	expect(result).toEqual([]);
});
