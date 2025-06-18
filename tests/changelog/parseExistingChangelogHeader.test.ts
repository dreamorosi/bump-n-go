import { it, expect, beforeEach, vi } from 'vitest';
import { parseExistingChangelogHeader } from '../../src/changelog.js';

const mocks = vi.hoisted(() => ({
	readFileSync: vi.fn(),
	statSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
	readFileSync: mocks.readFileSync,
	statSync: mocks.statSync,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('extracts existing changelog header', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const existingContent = '# Changelog\n\n## [1.0.0] (2024-01-01)\n\n### Features\n\n- Initial release';
	
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	const result = parseExistingChangelogHeader(changelogPath);

	// Assess
	expect(result).toBe('# Changelog\n\n');
	expect(mocks.statSync).toHaveBeenCalledWith(changelogPath);
	expect(mocks.readFileSync).toHaveBeenCalledWith(changelogPath, 'utf-8');
});

it('handles different changelog header formats', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const existingContent = '# Change Log\n\n## Version 1.0.0\n\n- First release';
	
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	const result = parseExistingChangelogHeader(changelogPath);

	// Assess
	expect(result).toBe('# Change Log\n\n');
});

it('handles header with extra spaces', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const existingContent = '# change log \n\n## Version 1.0.0\n\n- First release';
	
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	const result = parseExistingChangelogHeader(changelogPath);

	// Assess
	expect(result).toBe('# change log \n\n');
});

it('handles case insensitive matching', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const existingContent = '# CHANGELOG\n\n## Version 1.0.0\n\n- First release';
	
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	const result = parseExistingChangelogHeader(changelogPath);

	// Assess
	expect(result).toBe('# CHANGELOG\n\n');
});

it('returns default header when file does not exist', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	
	mocks.statSync.mockImplementation(() => {
		throw new Error('File not found');
	});

	// Act
	const result = parseExistingChangelogHeader(changelogPath);

	// Assess
	expect(result).toBe('# Changelog\n\n');
	expect(mocks.readFileSync).not.toHaveBeenCalled();
});

it('returns default header when statSync indicates not a file', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	
	mocks.statSync.mockReturnValue({ isFile: () => false });

	// Act
	const result = parseExistingChangelogHeader(changelogPath);

	// Assess
	expect(result).toBe('# Changelog\n\n');
	expect(mocks.readFileSync).not.toHaveBeenCalled();
});

it('returns default header when no header match found', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const existingContent = '## Version 1.0.0\n\n- First release without main header';
	
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	const result = parseExistingChangelogHeader(changelogPath);

	// Assess
	expect(result).toBe('# Changelog\n\n');
});

it('handles single newline after header', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const existingContent = '# Changelog\n## Version 1.0.0\n\n- First release';
	
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	const result = parseExistingChangelogHeader(changelogPath);

	// Assess
	expect(result).toBe('# Changelog\n');
});

it('handles multiple newlines after header', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const existingContent = '# Changelog\n\n\n## Version 1.0.0\n\n- First release';
	
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	const result = parseExistingChangelogHeader(changelogPath);

	// Assess
	expect(result).toBe('# Changelog\n\n');
});