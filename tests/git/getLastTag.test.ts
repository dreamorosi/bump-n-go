import { it, expect, beforeEach, vi } from 'vitest';
import { getLastTag } from '../../src/git.js';

const mocks = vi.hoisted(() => ({
	execSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
	execSync: mocks.execSync,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('returns the last tag when available', () => {
	// Prepare
	mocks.execSync.mockReturnValue(Buffer.from('v1.2.3\n'));
	
	// Act
	const result = getLastTag('/test/path');
	
	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith('git describe --tags --abbrev=0', {
		cwd: '/test/path',
	});
	expect(result).toBe('v1.2.3');
});

it('returns null when no tags are found', () => {
	// Prepare
	mocks.execSync.mockImplementation(() => {
		throw new Error('No tags found');
	});
	
	// Act
	const result = getLastTag('/test/path');
	
	// Assess
	expect(mocks.execSync).toHaveBeenCalledWith('git describe --tags --abbrev=0', {
		cwd: '/test/path',
	});
	expect(result).toBeNull();
});

it('trims whitespace from tag output', () => {
	// Prepare
	mocks.execSync.mockReturnValue(Buffer.from('  v2.0.0  \n\t  '));
	
	// Act
	const result = getLastTag('/test/path');
	
	// Assess
	expect(result).toBe('v2.0.0');
});