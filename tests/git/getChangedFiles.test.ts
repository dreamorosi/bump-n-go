import { it, expect, beforeEach, vi } from 'vitest';
import { getChangedFiles } from '../../src/git.js';

const mocks = vi.hoisted(() => ({
	execSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
	execSync: mocks.execSync,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('returns array of changed files', () => {
	// Prepare
	const mockOutput = 'src/file1.ts\nsrc/file2.ts\nREADME.md\n';
	mocks.execSync.mockReturnValue(Buffer.from(mockOutput));
	
	// Act
	const result = getChangedFiles('/test/path', 'abc123');
	
	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith(
		'git show --name-only --pretty=format: abc123',
		{ cwd: '/test/path' }
	);
	expect(result).toEqual(['src/file1.ts', 'src/file2.ts', 'README.md']);
});

it('filters out empty lines in changed files', () => {
	// Prepare
	const mockOutput = 'src/file1.ts\n\n\nsrc/file2.ts\n\n';
	mocks.execSync.mockReturnValue(Buffer.from(mockOutput));
	
	// Act
	const result = getChangedFiles('/test/path', 'abc123');
	
	// Assess
	expect(result).toEqual(['src/file1.ts', 'src/file2.ts']);
});

it('returns empty array when getChangedFiles command fails', () => {
	// Prepare
	mocks.execSync.mockImplementation(() => {
		throw new Error('Git command failed');
	});
	
	// Act
	const result = getChangedFiles('/test/path', 'abc123');
	
	// Assess
	expect(result).toEqual([]);
});

it('handles empty output for changed files', () => {
	// Prepare
	mocks.execSync.mockReturnValue(Buffer.from(''));
	
	// Act
	const result = getChangedFiles('/test/path', 'abc123');
	
	// Assess
	expect(result).toEqual([]);
});

it('filters lines with only whitespace in changed files', () => {
	// Prepare
	const mockOutput = 'src/file1.ts\n   \n\t\n  \nsrc/file2.ts';
	mocks.execSync.mockReturnValue(Buffer.from(mockOutput));
	
	// Act
	const result = getChangedFiles('/test/path', 'abc123');
	
	// Assess
	expect(result).toEqual(['src/file1.ts', 'src/file2.ts']);
});