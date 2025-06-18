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

it('bumps versions for all workspaces', () => {
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

	mocks.join
		.mockReturnValueOnce('/test/packages/package-a/package.json')
		.mockReturnValueOnce('/test/packages/package-b/package.json')
		.mockReturnValueOnce('/test/package-lock.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync
		.mockReturnValueOnce('{"name":"package-a","version":"1.0.0"}')
		.mockReturnValueOnce('{"name":"package-b","version":"1.0.0"}')
		.mockReturnValueOnce('{"name":"root","packages":{}}');

	// Act
	bumpVersions('/test', workspaces, '2.1.0');

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/package-a/package.json',
		'{\n\t"name": "package-a",\n\t"version": "2.1.0"\n}\n',
		'utf-8'
	);
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/package-b/package.json',
		'{\n\t"name": "package-b",\n\t"version": "2.1.0"\n}\n',
		'utf-8'
	);
});

it('updates package-lock.json after updating workspace packages', () => {
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
		packages: {
			'packages/package-a': { name: 'package-a', version: '1.0.0' },
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
	expect(mocks.writeFileSync).toHaveBeenCalledTimes(2);
	expect(mocks.writeFileSync).toHaveBeenNthCalledWith(
		1,
		'/test/packages/package-a/package.json',
		'{\n\t"name": "package-a",\n\t"version": "2.0.0"\n}\n',
		'utf-8'
	);
	
	const expectedLockfile = {
		name: 'root',
		packages: {
			'packages/package-a': { name: 'package-a', version: '2.0.0' },
		},
	};
	expect(mocks.writeFileSync).toHaveBeenNthCalledWith(
		2,
		'/test/package-lock.json',
		`${JSON.stringify(expectedLockfile, null, 2)}\n`,
		'utf-8'
	);
});

it('handles mixed workspace scenarios with private packages', () => {
	// Prepare
	const publicWorkspace: Workspace = {
		name: 'public-package',
		shortName: 'public-package',
		path: '/test/packages/public-package',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const privateWorkspace: Workspace = {
		name: 'private-package',
		shortName: 'private-package',
		path: '/test/packages/private-package',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: true,
	};
	const workspaces = { 
		'public-package': publicWorkspace, 
		'private-package': privateWorkspace 
	};

	mocks.join
		.mockReturnValueOnce('/test/packages/public-package/package.json')
		.mockReturnValueOnce('/test/packages/private-package/package.json')
		.mockReturnValueOnce('/test/package-lock.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync
		.mockReturnValueOnce('{"name":"public-package","version":"1.0.0"}')
		.mockReturnValueOnce('{"name":"private-package","version":"1.0.0","private":true}')
		.mockReturnValueOnce('{"name":"root","packages":{}}');

	// Act
	bumpVersions('/test', workspaces, '3.0.0');

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/public-package/package.json',
		'{\n\t"name": "public-package",\n\t"version": "3.0.0"\n}\n',
		'utf-8'
	);
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/private-package/package.json',
		'{\n\t"name": "private-package",\n\t"version": "3.0.0",\n\t"private": true\n}\n',
		'utf-8'
	);
});

it('handles empty workspace collection', () => {
	// Prepare
	const workspaces: Record<string, Workspace> = {};

	mocks.join.mockReturnValue('/test/package-lock.json');
	mocks.existsSync.mockReturnValue(false);

	// Act
	bumpVersions('/test', workspaces, '1.0.0');

	// Assess
	expect(mocks.writeFileSync).not.toHaveBeenCalled();
});