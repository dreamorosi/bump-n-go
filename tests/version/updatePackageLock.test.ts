import { it, expect, beforeEach, vi } from 'vitest';
import { bumpVersions } from '../../src/version.js';
import type { Workspace } from '../../src/types.js';

const mocks = vi.hoisted(() => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	join: vi.fn(),
}));

vi.mock('node:fs', () => ({
	existsSync: mocks.existsSync,
	readFileSync: mocks.readFileSync,
	writeFileSync: mocks.writeFileSync,
}));

vi.mock('node:path', () => ({
	join: mocks.join,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('updates workspace package versions in package-lock.json', () => {
	// Prepare
	const workspace1: Workspace = {
		name: 'package-a',
		shortName: 'package-a',
		path: '/test/packages/package-a',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspace2: Workspace = {
		name: 'package-b',
		shortName: 'package-b',
		path: '/test/packages/package-b',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'package-a': workspace1, 'package-b': workspace2 };
	const lockfile = {
		name: 'root',
		version: '1.0.0',
		packages: {
			'': { name: 'root', version: '1.0.0' },
			'packages/package-a': { name: 'package-a', version: '1.0.0' },
			'packages/package-b': { name: 'package-b', version: '1.0.0' },
			'node_modules/external-lib': { name: 'external-lib', version: '2.0.0' },
		},
	};

	mocks.join
		.mockReturnValueOnce('/test/packages/package-a/package.json')
		.mockReturnValueOnce('/test/packages/package-b/package.json')
		.mockReturnValueOnce('/test/package-lock.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync
		.mockReturnValueOnce('{"name":"package-a","version":"1.0.0"}')
		.mockReturnValueOnce('{"name":"package-b","version":"1.0.0"}')
		.mockReturnValueOnce(JSON.stringify(lockfile));

	// Act
	bumpVersions('/test', workspaces, '2.1.0');

	// Assess
	const expectedLockfile = {
		name: 'root',
		version: '1.0.0',
		packages: {
			'': { name: 'root', version: '1.0.0' },
			'packages/package-a': { name: 'package-a', version: '2.1.0' },
			'packages/package-b': { name: 'package-b', version: '2.1.0' },
			'node_modules/external-lib': { name: 'external-lib', version: '2.0.0' },
		},
	};

	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/package-lock.json',
		`${JSON.stringify(expectedLockfile, null, 2)}\n`,
		'utf-8'
	);
});

it('skips root package when updating lockfile', () => {
	// Prepare
	const workspace: Workspace = {
		name: 'root',
		shortName: 'root',
		path: '/test',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { root: workspace };
	const lockfile = {
		name: 'root',
		version: '1.0.0',
		packages: {
			'': { name: 'root', version: '1.0.0' },
		},
	};

	mocks.join
		.mockReturnValueOnce('/test/package.json')
		.mockReturnValueOnce('/test/package-lock.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync
		.mockReturnValueOnce('{"name":"root","version":"1.0.0"}')
		.mockReturnValueOnce(JSON.stringify(lockfile));

	// Act
	bumpVersions('/test', workspaces, '2.0.0');

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/package.json',
		'{\n\t"name": "root",\n\t"version": "2.0.0"\n}\n',
		'utf-8'
	);
	expect(mocks.writeFileSync).not.toHaveBeenCalledWith(
		expect.stringContaining('package-lock.json'),
		expect.any(String),
		'utf-8'
	);
});

it('skips non-existent package-lock.json', () => {
	// Prepare
	const workspace: Workspace = {
		name: 'test-package',
		shortName: 'test-package',
		path: '/test/packages/test-package',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'test-package': workspace };

	mocks.join
		.mockReturnValueOnce('/test/packages/test-package/package.json')
		.mockReturnValueOnce('/test/package-lock.json');
	mocks.existsSync
		.mockReturnValueOnce(true)
		.mockReturnValueOnce(false);
	mocks.readFileSync.mockReturnValueOnce('{"name":"test-package","version":"1.0.0"}');

	// Act
	bumpVersions('/test', workspaces, '2.0.0');

	// Assess
	expect(mocks.readFileSync).toHaveBeenCalledTimes(1);
	expect(mocks.writeFileSync).toHaveBeenCalledTimes(1);
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/test-package/package.json',
		'{\n\t"name": "test-package",\n\t"version": "2.0.0"\n}\n',
		'utf-8'
	);
});

it('only writes lockfile when updates are made', () => {
	// Prepare
	const workspace: Workspace = {
		name: 'package-a',
		shortName: 'package-a',
		path: '/test/packages/package-a',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'package-a': workspace };
	const lockfile = {
		name: 'root',
		version: '1.0.0',
		packages: {
			'': { name: 'root', version: '1.0.0' },
			'node_modules/external-lib': { name: 'external-lib', version: '2.0.0' },
		},
	};

	mocks.join
		.mockReturnValueOnce('/test/packages/package-a/package.json')
		.mockReturnValueOnce('/test/package-lock.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync
		.mockReturnValueOnce('{"name":"package-a","version":"1.0.0"}')
		.mockReturnValueOnce(JSON.stringify(lockfile));

	// Act
	bumpVersions('/test', workspaces, '2.0.0');

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledTimes(1);
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/package-a/package.json',
		'{\n\t"name": "package-a",\n\t"version": "2.0.0"\n}\n',
		'utf-8'
	);
});

it('handles lockfile packages without name property', () => {
	// Prepare
	const workspace: Workspace = {
		name: 'package-a',
		shortName: 'package-a',
		path: '/test/packages/package-a',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'package-a': workspace };
	const lockfile = {
		name: 'root',
		version: '1.0.0',
		packages: {
			'': { name: 'root', version: '1.0.0' },
			'packages/package-a': { version: '1.0.0' },
			'packages/no-name': 'invalid-entry',
		},
	};

	mocks.join
		.mockReturnValueOnce('/test/packages/package-a/package.json')
		.mockReturnValueOnce('/test/package-lock.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync
		.mockReturnValueOnce('{"name":"package-a","version":"1.0.0"}')
		.mockReturnValueOnce(JSON.stringify(lockfile));

	// Act
	bumpVersions('/test', workspaces, '2.0.0');

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/package-a/package.json',
		'{\n\t"name": "package-a",\n\t"version": "2.0.0"\n}\n',
		'utf-8'
	);
	expect(mocks.writeFileSync).not.toHaveBeenCalledWith(
		expect.stringContaining('package-lock.json'),
		expect.any(String),
		'utf-8'
	);
});