import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { updateChangelogs } from '../../src/changelog.js';
import type { Workspace } from '../../src/types.js';

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

it('updates both root and workspace changelogs', () => {
	// Prepare
	const rootPath = '/test';
	const workspace: Workspace = {
		name: 'test-package',
		shortName: 'test-package',
		path: '/test/packages/test-package',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Add new feature',
				type: 'feat',
				scope: 'core',
				breaking: false,
				notes: [],
				hash: 'abc1234',
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'test-package': workspace };
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const baseUrl = 'https://github.com/user/repo';

	mocks.join
		.mockReturnValueOnce('/test/CHANGELOG.md') // Root changelog
		.mockReturnValueOnce('/test/packages/test-package/CHANGELOG.md') // Workspace path comparison
		.mockReturnValueOnce('/test/packages/test-package/CHANGELOG.md'); // Inside updateWorkspaceChangelog
	mocks.statSync.mockReturnValue({
		isFile: () => true,
	} as import('node:fs').Stats);
	mocks.readFileSync.mockReturnValue('# Changelog\n\n');

	// Act
	updateChangelogs(rootPath, workspaces, version, versionLink, baseUrl);

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledTimes(2);

	// Check root changelog update
	const rootCall = mocks.writeFileSync.mock.calls.find(
		(call) => call[0] === '/test/CHANGELOG.md'
	);
	expect(rootCall).toBeDefined();
	if (rootCall) {
		expect(rootCall[1]).toContain(
			'## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)'
		);
		expect(rootCall[1]).toContain('### Features');
		// In a single-package repository, package name prefix should be omitted
		expect(rootCall[1]).toContain(
			'- Add new feature ([abc1234](https://github.com/user/repo/commit/abc1234))'
		);
		expect(rootCall[1]).not.toContain('**test-package**');
	} else {
		throw new Error('Root changelog call not found');
	}
	// Check workspace changelog update
	const workspaceCall = mocks.writeFileSync.mock.calls.find(
		(call) => call[0] === '/test/packages/test-package/CHANGELOG.md'
	);
	expect(workspaceCall).toBeDefined();
	if (workspaceCall) {
		expect(workspaceCall[1]).toContain(
			'## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)'
		);
		expect(workspaceCall[1]).toContain('### Features');
		expect(workspaceCall[1]).toContain(
			'- Add new feature ([abc1234](https://github.com/user/repo/commit/abc1234))'
		);
	} else {
		throw new Error('Workspace changelog call not found');
	}
});

it('excludes private packages from root changelog', () => {
	// Prepare
	const rootPath = '/test';
	const publicWorkspace: Workspace = {
		name: 'public-package',
		shortName: 'public-package',
		path: '/test/packages/public-package',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Public feature',
				type: 'feat',
				scope: 'core',
				breaking: false,
				notes: [],
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const privateWorkspace: Workspace = {
		name: 'private-package',
		shortName: 'private-package',
		path: '/test/packages/private-package',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Private feature',
				type: 'feat',
				scope: 'core',
				breaking: false,
				notes: [],
			},
		],
		dependencyNames: [],
		isPrivate: true,
	};
	const workspaces = {
		'public-package': publicWorkspace,
		'private-package': privateWorkspace,
	};
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const baseUrl = 'https://github.com/user/repo';

	mocks.join
		.mockReturnValueOnce('/test/CHANGELOG.md') // Root changelog
		.mockReturnValueOnce('/test/packages/public-package/CHANGELOG.md') // Public workspace path comparison
		.mockReturnValueOnce('/test/packages/private-package/CHANGELOG.md') // Private workspace path comparison
		.mockReturnValueOnce('/test/packages/public-package/CHANGELOG.md') // Inside updateWorkspaceChangelog for public
		.mockReturnValueOnce('/test/packages/private-package/CHANGELOG.md'); // Inside updateWorkspaceChangelog for private
	mocks.statSync.mockReturnValue({
		isFile: () => true,
	} as import('node:fs').Stats);
	mocks.readFileSync
		.mockReturnValueOnce('# Changelog\n\n') // Root changelog parseExistingChangelogHeader
		.mockReturnValueOnce('# Changelog\n\n') // Root changelog updateRootChangelog
		.mockReturnValueOnce('# Changelog\n\n') // Public workspace parseExistingChangelogHeader
		.mockReturnValueOnce('# Changelog\n\n') // Public workspace updateWorkspaceChangelog
		.mockReturnValueOnce('# Changelog\n\n') // Private workspace parseExistingChangelogHeader
		.mockReturnValueOnce('# Changelog\n\n'); // Private workspace updateWorkspaceChangelog

	// Act
	updateChangelogs(rootPath, workspaces, version, versionLink, baseUrl);

	// Check root changelog excludes private packages
	const rootCall = mocks.writeFileSync.mock.calls.find(
		(call) => call[0] === '/test/CHANGELOG.md'
	);
	if (rootCall) {
		expect(rootCall[1]).toContain('Public feature');
		expect(rootCall[1]).not.toContain('Private feature');
		expect(rootCall[1]).not.toContain('private-package');
		// In a monorepo with multiple packages, package name prefix should be included
		expect(rootCall[1]).toContain('**public-package**');
	} else {
		throw new Error('Root changelog call not found');
	}
});

it('includes private packages in their workspace changelogs', () => {
	// Prepare - focus only on private workspace
	const rootPath = '/test';
	const privateWorkspace: Workspace = {
		name: 'private-package',
		shortName: 'private-package',
		path: '/test/packages/private-package',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Private feature',
				type: 'feat',
				scope: 'core',
				breaking: false,
				notes: [],
				hash: 'abc123',
			},
		],
		dependencyNames: [],
		isPrivate: true,
	};
	const workspaces = {
		'private-package': privateWorkspace,
	};
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const baseUrl = 'https://github.com/user/repo';

	mocks.join
		.mockReturnValueOnce('/test/CHANGELOG.md') // Root changelog
		.mockReturnValueOnce('/test/packages/private-package/CHANGELOG.md') // Private workspace path comparison
		.mockReturnValueOnce('/test/packages/private-package/CHANGELOG.md'); // Inside updateWorkspaceChangelog for private
	mocks.statSync.mockReturnValue({
		isFile: () => true,
	} as import('node:fs').Stats);
	mocks.readFileSync
		.mockReturnValueOnce('# Changelog\n\n') // Root changelog parseExistingChangelogHeader
		.mockReturnValueOnce('# Changelog\n\n') // Root changelog updateRootChangelog
		.mockReturnValueOnce('# Changelog\n\n') // Private workspace parseExistingChangelogHeader
		.mockReturnValueOnce('# Changelog\n\n'); // Private workspace updateWorkspaceChangelog

	// Act
	updateChangelogs(rootPath, workspaces, version, versionLink, baseUrl);

	// Check private workspace changelog includes private feature
	const privateCall = mocks.writeFileSync.mock.calls.find(
		(call) => call[0] === '/test/packages/private-package/CHANGELOG.md'
	);
	expect(privateCall).toBeDefined();
	if (privateCall) {
		expect(privateCall[1]).toContain('Private feature');
	} else {
		throw new Error('Private workspace changelog call not found');
	}
});

it('handles multiple workspaces with different commit types', () => {
	// Prepare
	const rootPath = '/test';
	const workspace1: Workspace = {
		name: 'package-a',
		shortName: 'package-a',
		path: '/test/packages/package-a',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Add feature',
				type: 'feat',
				scope: 'core',
				breaking: false,
				notes: [],
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspace2: Workspace = {
		name: 'package-b',
		shortName: 'package-b',
		path: '/test/packages/package-b',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Fix bug',
				type: 'fix',
				scope: 'core',
				breaking: false,
				notes: [],
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'package-a': workspace1, 'package-b': workspace2 };
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const baseUrl = 'https://github.com/user/repo';

	mocks.join.mockReturnValueOnce('/test/CHANGELOG.md');

	// Act
	updateChangelogs(rootPath, workspaces, version, versionLink, baseUrl);

	// Assess
	const rootCall = mocks.writeFileSync.mock.calls.find(
		(call) => call[0] === '/test/CHANGELOG.md'
	);
	if (rootCall) {
		expect(rootCall[1]).toContain('### Features');
		expect(rootCall[1]).toContain('### Bug Fixes');
		expect(rootCall[1]).toContain('**package-a** Add feature');
		expect(rootCall[1]).toContain('**package-b** Fix bug');
	} else {
		throw new Error('Root changelog call not found');
	}
});

it('handles workspaces with no changes', () => {
	// Prepare
	const rootPath = '/test';
	const workspace: Workspace = {
		name: 'unchanged-package',
		shortName: 'unchanged-package',
		path: '/test/packages/unchanged-package',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'unchanged-package': workspace };
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const baseUrl = 'https://github.com/user/repo';

	mocks.join
		.mockReturnValueOnce('/test/CHANGELOG.md') // Root changelog
		.mockReturnValueOnce('/test/packages/unchanged-package/CHANGELOG.md') // Workspace path comparison
		.mockReturnValueOnce('/test/packages/unchanged-package/CHANGELOG.md'); // Inside updateWorkspaceChangelog
	mocks.statSync.mockReturnValue({
		isFile: () => true,
	} as import('node:fs').Stats);
	mocks.readFileSync.mockReturnValueOnce('# Changelog\n\nExisting content\n');

	// Act
	updateChangelogs(rootPath, workspaces, version, versionLink, baseUrl);

	// Assess
	// Root changelog should have empty sections
	const rootCall = mocks.writeFileSync.mock.calls.find(
		(call) => call[0] === '/test/CHANGELOG.md'
	);
	if (rootCall) {
		expect(rootCall[1]).toContain(
			'## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)'
		);
		expect(rootCall[1]).not.toContain('### Features');
	} else {
		throw new Error('Root changelog call not found');
	}

	// Workspace changelog should get version bump note
	const workspaceCall = mocks.writeFileSync.mock.calls.find(
		(call) => call[0] === '/test/packages/unchanged-package/CHANGELOG.md'
	);
	if (workspaceCall) {
		expect(workspaceCall[1]).toContain(
			'**Note:** Version bump only for this package'
		);
	} else {
		throw new Error('Workspace changelog call not found');
	}
});

it('handles single-package repos without duplicating changelog', () => {
	// Prepare - single package repo where workspace path equals root path
	const rootPath = '/test';
	const workspace: Workspace = {
		name: 'single-package',
		shortName: 'single-package',
		path: '/test', // Same as root path
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Add single package feature',
				type: 'feat',
				scope: 'core',
				breaking: false,
				notes: [],
				hash: 'abc1234',
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'single-package': workspace };
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const baseUrl = 'https://github.com/user/repo';

	mocks.join
		.mockReturnValueOnce('/test/CHANGELOG.md') // Root changelog
		.mockReturnValueOnce('/test/CHANGELOG.md'); // Workspace path comparison (same as root)
	mocks.statSync.mockReturnValue({
		isFile: () => true,
	} as import('node:fs').Stats);
	mocks.readFileSync
		.mockReturnValueOnce('# Changelog\n\n') // Root changelog parseExistingChangelogHeader
		.mockReturnValueOnce('# Changelog\n\n'); // Root changelog updateRootChangelog

	// Act
	updateChangelogs(rootPath, workspaces, version, versionLink, baseUrl);

	// Assess - should only write once (root changelog), not twice
	expect(mocks.writeFileSync).toHaveBeenCalledTimes(1);

	const rootCall = mocks.writeFileSync.mock.calls.find(
		(call) => call[0] === '/test/CHANGELOG.md'
	);
	expect(rootCall).toBeDefined();
	if (rootCall) {
		expect(rootCall[1]).toContain('Add single package feature');
	} else {
		throw new Error('Root changelog call not found');
	}
});

it('handles empty workspaces object', () => {
	// Prepare
	const rootPath = '/test';
	const workspaces: Record<string, Workspace> = {};
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
	const baseUrl = 'https://github.com/user/repo';

	mocks.join.mockReturnValueOnce('/test/CHANGELOG.md');
	mocks.statSync.mockReturnValue({ isFile: () => true });
	mocks.readFileSync.mockReturnValue('# Changelog\n\n');

	// Act
	updateChangelogs(rootPath, workspaces, version, versionLink, baseUrl);

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledTimes(1);

	const rootCall = mocks.writeFileSync.mock.calls[0];
	expect(rootCall[0]).toBe('/test/CHANGELOG.md');
	expect(rootCall[1]).toContain(
		'## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)'
	);
	expect(rootCall[1]).not.toContain('### Features');
});
