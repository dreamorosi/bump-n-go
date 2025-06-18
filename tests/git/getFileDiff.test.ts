import { it, expect, beforeEach, vi } from 'vitest';
import { getFileDiff } from '../../src/git.js';

const mocks = vi.hoisted(() => ({
	execSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
	execSync: mocks.execSync,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('returns file diff content', () => {
	// Prepare
	const mockDiff = 'diff --git a/file.ts b/file.ts\n+added line\n-removed line';
	mocks.execSync.mockReturnValue(Buffer.from(mockDiff));
	
	// Act
	const result = getFileDiff('/test/path', 'abc123', 'src/file.ts');
	
	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith('git show abc123 -- "src/file.ts"', {
		cwd: '/test/path',
	});
	expect(result).toBe(mockDiff);
});

it('returns empty string when getFileDiff command fails', () => {
	// Prepare
	mocks.execSync.mockImplementation(() => {
		throw new Error('Git command failed');
	});
	
	// Act
	const result = getFileDiff('/test/path', 'abc123', 'src/file.ts');
	
	// Assess
	expect(result).toBe('');
});

it('properly quotes file path with spaces', () => {
	// Prepare
	const mockDiff = 'diff content';
	mocks.execSync.mockReturnValue(Buffer.from(mockDiff));
	
	// Act
	const result = getFileDiff('/test/path', 'abc123', 'src/file with spaces.ts');
	
	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith('git show abc123 -- "src/file with spaces.ts"', {
		cwd: '/test/path',
	});
	expect(result).toBe(mockDiff);
});

it('handles empty diff output', () => {
	// Prepare
	mocks.execSync.mockReturnValue(Buffer.from(''));
	
	// Act
	const result = getFileDiff('/test/path', 'abc123', 'src/file.ts');
	
	// Assess
	expect(result).toBe('');
});