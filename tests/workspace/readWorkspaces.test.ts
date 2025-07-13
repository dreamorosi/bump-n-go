import { beforeEach, expect, it, vi } from 'vitest';
import { readWorkspaces } from '../../src/workspace.js';

const mocks = vi.hoisted(() => ({
	readFileSync: vi.fn(),
	existsSync: vi.fn().mockReturnValue(true),
	globSync: vi.fn(),
}));

vi.mock('node:fs', async () => ({
	readFileSync: mocks.readFileSync,
	existsSync: mocks.existsSync,
	globSync: mocks.globSync,
}));

beforeEach(() => {
	vi.resetAllMocks();
	// Reset default mock behaviors
	mocks.existsSync.mockReturnValue(true);
});

it('reads workspaces from array format', () => {
	// Prepare
	const root = '/test/root';
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'root-pkg',
			workspaces: ['packages/*'],
		})
	);
	mocks.globSync.mockReturnValueOnce(['packages/a', 'packages/b']);
	mocks.readFileSync
		.mockImplementationOnce((_path: string) =>
			JSON.stringify({
				name: '@scope/pkg-a',
				version: '1.0.0',
				dependencies: {
					dep1: '1.0.0',
					dep2: '2.0.0',
				},
			})
		)
		.mockImplementationOnce((_path: string) =>
			JSON.stringify({
				name: 'pkg-b',
				version: '2.0.0',
				dependencies: {},
				private: true,
			})
		);

	// Act
	const result = readWorkspaces(root);

	// Assess
	expect(mocks.readFileSync).toHaveBeenCalledTimes(3);
	expect(mocks.readFileSync).toHaveBeenNthCalledWith(
		1,
		'/test/root/package.json',
		'utf-8'
	);
	expect(mocks.globSync).toHaveBeenCalledWith('packages/*', { cwd: root });
	expect(Object.keys(result)).toHaveLength(2);
	expect(result).toHaveProperty('pkg-a');
	expect(result).toHaveProperty('pkg-b');
	expect(result['pkg-a']).toEqual({
		name: '@scope/pkg-a',
		shortName: 'pkg-a',
		path: '/test/root/packages/a',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: ['dep1', 'dep2'],
		isPrivate: false,
	});
	expect(result['pkg-b']).toEqual({
		name: 'pkg-b',
		shortName: 'pkg-b',
		path: '/test/root/packages/b',
		version: '2.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: true,
	});
});

it('reads workspaces from object format', () => {
	// Prepare
	const root = '/test/root';
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'root-pkg',
			workspaces: {
				packages: ['apps/*', 'libs/*'],
			},
		})
	);
	mocks.globSync
		.mockReturnValueOnce(['apps/web', 'apps/mobile']) // First pattern
		.mockReturnValueOnce(['libs/ui', 'libs/utils']); // Second pattern
	const packageJsonMocks = [
		{
			name: 'web',
			version: '1.0.0',
			dependencies: { '@scope/ui': '1.0.0' },
		},
		{
			name: 'mobile',
			version: '1.0.0',
			dependencies: { '@scope/ui': '1.0.0', '@scope/utils': '1.0.0' },
		},
		{
			name: '@scope/ui',
			version: '1.0.0',
			dependencies: {},
		},
		{
			name: '@scope/utils',
			version: '1.0.0',
			dependencies: {},
			private: true,
		},
	];
	for (const pkg of packageJsonMocks) {
		mocks.readFileSync.mockImplementationOnce(() => JSON.stringify(pkg));
	}

	// Act
	const result = readWorkspaces(root);

	// Assess
	expect(mocks.readFileSync).toHaveBeenCalledTimes(5); // root + 4 workspaces
	expect(mocks.globSync).toHaveBeenCalledTimes(2);
	expect(mocks.globSync).toHaveBeenNthCalledWith(1, 'apps/*', { cwd: root });
	expect(mocks.globSync).toHaveBeenNthCalledWith(2, 'libs/*', { cwd: root });
	expect(Object.keys(result)).toHaveLength(4);
	expect(result).toHaveProperty('web');
	expect(result).toHaveProperty('mobile');
	expect(result).toHaveProperty('ui');
	expect(result).toHaveProperty('utils');
	expect(result.utils).toEqual({
		name: '@scope/utils',
		shortName: 'utils',
		path: '/test/root/libs/utils',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: true,
	});
});

it('handles empty or missing workspaces definition by treating root as workspace', () => {
	// Prepare
	const root = '/test/root';
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'root-pkg',
			version: '1.0.0',
		})
	);
	mocks.globSync.mockReturnValueOnce([]);

	// Act
	const result = readWorkspaces(root);

	// Assess
	expect(result).toEqual({
		'root-pkg': {
			name: 'root-pkg',
			shortName: 'root-pkg',
			path: '/test/root',
			version: '1.0.0',
			changed: false,
			commits: [],
			dependencyNames: [],
			isPrivate: false,
		},
	});
});

it('skips directories without package.json', () => {
	// Prepare
	const root = '/test/root';
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'root-pkg',
			workspaces: ['packages/*'],
		})
	);
	mocks.globSync.mockReturnValueOnce([
		'packages/a',
		'packages/b',
		'packages/c',
	]);
	mocks.existsSync
		.mockReturnValueOnce(true) // packages/a
		.mockReturnValueOnce(false) // packages/b
		.mockReturnValueOnce(true); // packages/c
	mocks.readFileSync
		.mockReturnValueOnce(JSON.stringify({ name: 'pkg-a', version: '1.0.0' }))
		.mockReturnValueOnce(JSON.stringify({ name: 'pkg-c', version: '1.0.0' }));

	// Act
	const result = readWorkspaces(root);

	// Assess
	expect(mocks.existsSync).toHaveBeenCalledTimes(3);
	expect(mocks.readFileSync).toHaveBeenCalledTimes(3); // root + 2 valid packages
	expect(Object.keys(result)).toHaveLength(2);
	expect(result).toHaveProperty('pkg-a');
	expect(result).toHaveProperty('pkg-c');
	expect(result).not.toHaveProperty('pkg-b');
});

it('uses directory name as fallback when checking the shortName', () => {
	// Prepare
	const root = '/test/root';
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'root-pkg',
			workspaces: ['packages/*'],
		})
	);
	mocks.globSync.mockReturnValueOnce(['packages/unnamed']);
	mocks.existsSync.mockReturnValueOnce(true);
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'unnamed-pkg',
			version: '1.0.0',
		})
	);

	// Act
	const result = readWorkspaces(root);

	// Assess
	expect(Object.keys(result)).toHaveLength(1);
	expect(result).toHaveProperty('unnamed-pkg');
	expect(result['unnamed-pkg'].name).toBe('unnamed-pkg');
	expect(result['unnamed-pkg'].shortName).toBe('unnamed-pkg');
});

it('handles scoped package names correctly', () => {
	// Prepare
	const root = '/test/root';
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'root-pkg',
			workspaces: ['packages/*'],
		})
	);
	mocks.globSync.mockReturnValueOnce(['packages/scoped']);
	mocks.existsSync.mockReturnValueOnce(true);
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: '@scope/pkg-name',
			version: '1.0.0',
		})
	);

	// Act
	const result = readWorkspaces(root);

	// Assess
	expect(Object.keys(result)).toHaveLength(1);
	expect(result).toHaveProperty('pkg-name');
	expect(result['pkg-name'].name).toBe('@scope/pkg-name');
	expect(result['pkg-name'].shortName).toBe('pkg-name');
});

it('uses directory name when package has no name property', () => {
	// Prepare
	const root = '/test/root';
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'root-pkg',
			workspaces: ['packages/*'],
		})
	);
	mocks.globSync.mockReturnValueOnce(['packages/my-package']);
	mocks.existsSync.mockReturnValueOnce(true);
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			version: '1.0.0',
		})
	);

	// Act
	const result = readWorkspaces(root);

	// Assess
	expect(Object.keys(result)).toHaveLength(1);
	expect(result).toHaveProperty('my-package');
	expect(result['my-package'].name).toBeUndefined();
	expect(result['my-package'].shortName).toBe('my-package');
	expect(result['my-package'].path).toBe('/test/root/packages/my-package');
});

it('uses directory name when package name is null', () => {
	// Prepare
	const root = '/test/root';
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'root-pkg',
			workspaces: ['packages/*'],
		})
	);
	mocks.globSync.mockReturnValueOnce(['packages/null-name']);
	mocks.existsSync.mockReturnValueOnce(true);
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: null,
			version: '1.0.0',
		})
	);

	// Act
	const result = readWorkspaces(root);

	// Assess
	expect(Object.keys(result)).toHaveLength(1);
	expect(result).toHaveProperty('null-name');
	expect(result['null-name'].name).toBeNull();
	expect(result['null-name'].shortName).toBe('null-name');
});

it('uses directory name when package name is empty string', () => {
	// Prepare
	const root = '/test/root';
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: 'root-pkg',
			workspaces: ['packages/*'],
		})
	);
	mocks.globSync.mockReturnValueOnce(['packages/empty-name']);
	mocks.existsSync.mockReturnValueOnce(true);
	mocks.readFileSync.mockImplementationOnce((_path: string) =>
		JSON.stringify({
			name: '',
			version: '1.0.0',
		})
	);

	// Act
	const result = readWorkspaces(root);

	// Assess
	expect(Object.keys(result)).toHaveLength(1);
	expect(result).toHaveProperty('empty-name');
	expect(result['empty-name'].name).toBe('');
	expect(result['empty-name'].shortName).toBe('empty-name');
});
