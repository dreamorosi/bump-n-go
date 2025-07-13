import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { updateRootChangelog } from '../../src/changelog.js';

const mocks = vi.hoisted(() => ({
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	statSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
	readFileSync: mocks.readFileSync,
	writeFileSync: mocks.writeFileSync,
	statSync: mocks.statSync,
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2024-03-15'));
});

afterEach(() => {
	vi.useRealTimers();
});

it('creates new changelog when file does not exist', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const sections = '### Features\n\n- **package-a** Add new feature\n';

	mocks.statSync.mockImplementation(() => {
		throw new Error('File not found');
	});

	// Act
	updateRootChangelog(changelogPath, version, versionLink, sections);

	// Assess
	const expectedContent =
		'# Changelog\n\n## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)\n\n### Features\n\n- **package-a** Add new feature\n\n\n';
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		changelogPath,
		expectedContent,
		'utf-8'
	);
});

it('prepends new version to existing changelog', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const version = '2.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v2.0.0';
	const sections = '### Features\n\n- **package-b** Add breaking change\n';
	const existingContent =
		'# Changelog\n\n## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-01-01)\n\n### Features\n\n- Initial release\n';

	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	updateRootChangelog(changelogPath, version, versionLink, sections);

	// Assess
	const expectedContent =
		'# Changelog\n\n## [2.0.0](https://github.com/user/repo/releases/tag/v2.0.0) (2024-03-15)\n\n### Features\n\n- **package-b** Add breaking change\n\n\n## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-01-01)\n\n### Features\n\n- Initial release\n';
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		changelogPath,
		expectedContent,
		'utf-8'
	);
});

it('preserves existing header format', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const version = '1.1.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.1.0';
	const sections = '### Features\n\n- **package-c** Add feature\n';
	const existingContent =
		'# Change Log\n\n## Version 1.0.0\n\n- Previous version';

	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	updateRootChangelog(changelogPath, version, versionLink, sections);

	// Assess
	const expectedContent =
		'# Change Log\n\n## [1.1.0](https://github.com/user/repo/releases/tag/v1.1.0) (2024-03-15)\n\n### Features\n\n- **package-c** Add feature\n\n\n## Version 1.0.0\n\n- Previous version';
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		changelogPath,
		expectedContent,
		'utf-8'
	);
});

it('handles empty sections', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const version = '1.0.1';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.1';
	const sections = '';

	mocks.statSync.mockImplementation(() => {
		throw new Error('File not found');
	});

	// Act
	updateRootChangelog(changelogPath, version, versionLink, sections);

	// Assess
	const expectedContent =
		'# Changelog\n\n## [1.0.1](https://github.com/user/repo/releases/tag/v1.0.1) (2024-03-15)\n\n\n\n';
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		changelogPath,
		expectedContent,
		'utf-8'
	);
});

it('handles file that exists but is not readable', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const sections = '### Features\n\n- **package-a** Add feature\n';

	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockImplementation(() => {
		throw new Error('Permission denied');
	});

	// Act
	updateRootChangelog(changelogPath, version, versionLink, sections);

	// Assess
	const expectedContent =
		'# Changelog\n\n## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)\n\n### Features\n\n- **package-a** Add feature\n\n\n';
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		changelogPath,
		expectedContent,
		'utf-8'
	);
});

it('handles changelog without existing header', () => {
	// Prepare
	const changelogPath = '/test/CHANGELOG.md';
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const sections = '### Features\n\n- **package-a** Add feature\n';
	const existingContent =
		'## Version 0.9.0\n\n- Previous content without main header';

	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	updateRootChangelog(changelogPath, version, versionLink, sections);

	// Assess
	const expectedContent =
		'# Changelog\n\n## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)\n\n### Features\n\n- **package-a** Add feature\n\n\n## Version 0.9.0\n\n- Previous content without main header';
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		changelogPath,
		expectedContent,
		'utf-8'
	);
});
