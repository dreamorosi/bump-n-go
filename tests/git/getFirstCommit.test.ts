import { beforeEach, expect, it, vi } from 'vitest';
import { getFirstCommit } from '../../src/git.js';

const mocks = vi.hoisted(() => ({
	execSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
	execSync: mocks.execSync,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('returns the first commit hash when available', () => {
	// Prepare
	mocks.execSync.mockReturnValue(Buffer.from('abc123def456\n'));

	// Act
	const result = getFirstCommit('/test/path');

	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith(
		'git rev-list --max-parents=0 HEAD',
		{
			cwd: '/test/path',
		}
	);
	expect(result).toBe('abc123def456');
});

it('returns null when getFirstCommit command fails', () => {
	// Prepare
	mocks.execSync.mockImplementation(() => {
		throw new Error('Git command failed');
	});

	// Act
	const result = getFirstCommit('/test/path');

	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith(
		'git rev-list --max-parents=0 HEAD',
		{
			cwd: '/test/path',
		}
	);
	expect(result).toBeNull();
});

it('trims whitespace from commit hash', () => {
	// Prepare
	mocks.execSync.mockReturnValue(Buffer.from('  def789ghi012  \n'));

	// Act
	const result = getFirstCommit('/test/path');

	// Assess
	expect(result).toBe('def789ghi012');
});

it('handles non-Error exceptions', () => {
	// Prepare
	mocks.execSync.mockImplementation(() => {
		throw 'String error';
	});

	// Act
	const result = getFirstCommit('/test/path');

	// Assess
	expect(result).toBeNull();
});
