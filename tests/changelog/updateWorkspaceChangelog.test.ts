import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { updateWorkspaceChangelog } from '../../src/changelog.js';

const mocks = vi.hoisted(() => ({
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	statSync: vi.fn(),
	join: vi.fn(),
}));

vi.mock('node:fs', () => ({
	readFileSync: mocks.readFileSync,
	writeFileSync: mocks.writeFileSync,
	statSync: mocks.statSync,
}));

vi.mock('node:path', () => ({
	join: mocks.join,
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2024-03-15'));
});

afterEach(() => {
	vi.useRealTimers();
});

it('updates workspace changelog with sections', () => {
	// Prepare
	const workspacePath = '/test/packages/workspace-a';
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const workspaceSections = new Map([
		['Features', ['- Add new feature', '- Add another feature']],
		['Bug Fixes', ['- Fix critical bug']],
	]);
	const existingContent = '# Changelog\n\n## [0.9.0] (2024-01-01)\n\n- Previous release';

	mocks.join.mockReturnValue('/test/packages/workspace-a/CHANGELOG.md');
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	updateWorkspaceChangelog(workspacePath, version, versionLink, workspaceSections);

	// Assess
	const expectedContent = '# Changelog\n\n## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)\n\n### Features\n\n- Add new feature\n- Add another feature\n\n### Bug Fixes\n\n- Fix critical bug\n## [0.9.0] (2024-01-01)\n\n- Previous release';
	expect(mocks.writeFileSync).toHaveBeenCalledWith('/test/packages/workspace-a/CHANGELOG.md', expectedContent, 'utf-8');
});

it('adds version bump note when no sections provided', () => {
	// Prepare
	const workspacePath = '/test/packages/workspace-b';
	const version = '1.1.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.1.0';
	const workspaceSections = undefined;
	const existingContent = '# Changelog\n\n## [1.0.0] (2024-01-01)\n\n- Initial release';

	mocks.join.mockReturnValue('/test/packages/workspace-b/CHANGELOG.md');
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	updateWorkspaceChangelog(workspacePath, version, versionLink, workspaceSections);

	// Assess
	const expectedContent = '# Changelog\n\n## [1.1.0](https://github.com/user/repo/releases/tag/v1.1.0) (2024-03-15)\n\n**Note:** Version bump only for this package\n\n## [1.0.0] (2024-01-01)\n\n- Initial release';
	expect(mocks.writeFileSync).toHaveBeenCalledWith('/test/packages/workspace-b/CHANGELOG.md', expectedContent, 'utf-8');
});

it('skips update when changelog file does not exist', () => {
	// Prepare
	const workspacePath = '/test/packages/workspace-c';
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const workspaceSections = new Map([['Features', ['- Add feature']]]);

	mocks.join.mockReturnValue('/test/packages/workspace-c/CHANGELOG.md');
	mocks.statSync.mockImplementation(() => {
		throw new Error('File not found');
	});

	// Act
	updateWorkspaceChangelog(workspacePath, version, versionLink, workspaceSections);

	// Assess
	expect(mocks.readFileSync).not.toHaveBeenCalled();
	expect(mocks.writeFileSync).not.toHaveBeenCalled();
});

it('skips update when path is not a file', () => {
	// Prepare
	const workspacePath = '/test/packages/workspace-d';
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const workspaceSections = new Map([['Features', ['- Add feature']]]);

	mocks.join.mockReturnValue('/test/packages/workspace-d/CHANGELOG.md');
	mocks.statSync.mockReturnValue({ isFile: () => false });

	// Act
	updateWorkspaceChangelog(workspacePath, version, versionLink, workspaceSections);

	// Assess
	expect(mocks.readFileSync).not.toHaveBeenCalled();
	expect(mocks.writeFileSync).not.toHaveBeenCalled();
});

it('handles empty workspace sections map', () => {
	// Prepare
	const workspacePath = '/test/packages/workspace-e';
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const workspaceSections = new Map();
	const existingContent = '# Changelog\n\n## [0.9.0] (2024-01-01)\n\n- Previous';

	mocks.join.mockReturnValue('/test/packages/workspace-e/CHANGELOG.md');
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	updateWorkspaceChangelog(workspacePath, version, versionLink, workspaceSections);

	// Assess
	const expectedContent = '# Changelog\n\n## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)\n\n## [0.9.0] (2024-01-01)\n\n- Previous';
	expect(mocks.writeFileSync).toHaveBeenCalledWith('/test/packages/workspace-e/CHANGELOG.md', expectedContent, 'utf-8');
});

it('preserves existing changelog header format', () => {
	// Prepare
	const workspacePath = '/test/packages/workspace-f';
	const version = '2.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v2.0.0';
	const workspaceSections = new Map([['Features', ['- Breaking change']]]);
	const existingContent = '# Change Log\n\n## Version 1.0.0\n\n- Old format';

	mocks.join.mockReturnValue('/test/packages/workspace-f/CHANGELOG.md');
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	updateWorkspaceChangelog(workspacePath, version, versionLink, workspaceSections);

	// Assess
	const expectedContent = '# Change Log\n\n## [2.0.0](https://github.com/user/repo/releases/tag/v2.0.0) (2024-03-15)\n\n### Features\n\n- Breaking change\n## Version 1.0.0\n\n- Old format';
	expect(mocks.writeFileSync).toHaveBeenCalledWith('/test/packages/workspace-f/CHANGELOG.md', expectedContent, 'utf-8');
});

it('handles single section with multiple entries', () => {
	// Prepare
	const workspacePath = '/test/packages/workspace-g';
	const version = '1.2.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.2.0';
	const workspaceSections = new Map([
		['Features', [
			'- Add user authentication',
			'- Add password reset',
			'- Add email verification'
		]],
	]);
	const existingContent = '# Changelog\n\n';

	mocks.join.mockReturnValue('/test/packages/workspace-g/CHANGELOG.md');
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue(existingContent);

	// Act
	updateWorkspaceChangelog(workspacePath, version, versionLink, workspaceSections);

	// Assess
	const expectedContent = '# Changelog\n\n## [1.2.0](https://github.com/user/repo/releases/tag/v1.2.0) (2024-03-15)\n\n### Features\n\n- Add user authentication\n- Add password reset\n- Add email verification\n';
	expect(mocks.writeFileSync).toHaveBeenCalledWith('/test/packages/workspace-g/CHANGELOG.md', expectedContent, 'utf-8');
});