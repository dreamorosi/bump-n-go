import { beforeEach, expect, it, vi } from 'vitest';
import type { Workspace } from '../../src/types.js';
import { bumpVersions } from '../../src/version.js';

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

it('updates workspace package version', () => {
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
	const packageJson = {
		name: 'test-package',
		version: '1.0.0',
	};

	mocks.join.mockReturnValue('/test/packages/test-package/package.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync.mockReturnValue(JSON.stringify(packageJson));

	// Act
	bumpVersions('/test', workspaces, '2.0.0');

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/test-package/package.json',
		'{\n\t"name": "test-package",\n\t"version": "2.0.0"\n}\n',
		'utf-8'
	);
});

it('updates intra-project dependencies with preserved operators', () => {
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
	const packageJson = {
		name: 'package-a',
		version: '1.0.0',
		dependencies: {
			'package-b': '^1.0.0',
			'external-lib': '~2.0.0',
		},
		devDependencies: {
			'package-b': '>=1.0.0',
		},
		peerDependencies: {
			'package-b': '~1.0.0',
		},
	};

	mocks.join.mockReturnValue('/test/packages/package-a/package.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync.mockReturnValue(JSON.stringify(packageJson));

	// Act
	bumpVersions('/test', workspaces, '2.1.0');

	// Assess
	const expectedPackageJson = {
		name: 'package-a',
		version: '2.1.0',
		dependencies: {
			'package-b': '^2.1.0',
			'external-lib': '~2.0.0',
		},
		devDependencies: {
			'package-b': '>=2.1.0',
		},
		peerDependencies: {
			'package-b': '~2.1.0',
		},
	};

	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/package-a/package.json',
		`${JSON.stringify(expectedPackageJson, null, '\t')}\n`,
		'utf-8'
	);
});

it('skips file: dependencies', () => {
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
	const packageJson = {
		name: 'package-a',
		version: '1.0.0',
		dependencies: {
			'local-package': 'file:../local-package',
		},
	};

	mocks.join.mockReturnValue('/test/packages/package-a/package.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync.mockReturnValue(JSON.stringify(packageJson));

	// Act
	bumpVersions('/test', workspaces, '2.0.0');

	// Assess
	const expectedPackageJson = {
		name: 'package-a',
		version: '2.0.0',
		dependencies: {
			'local-package': 'file:../local-package',
		},
	};

	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/package-a/package.json',
		`${JSON.stringify(expectedPackageJson, null, '\t')}\n`,
		'utf-8'
	);
});

it('skips non-existent package.json files', () => {
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

	mocks.join.mockReturnValue('/test/packages/test-package/package.json');
	mocks.existsSync.mockReturnValue(false);

	// Act
	bumpVersions('/test', workspaces, '2.0.0');

	// Assess
	expect(mocks.readFileSync).not.toHaveBeenCalled();
	expect(mocks.writeFileSync).not.toHaveBeenCalled();
});

it('handles packages with no dependencies', () => {
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
	const packageJson = {
		name: 'test-package',
		version: '1.0.0',
	};

	mocks.join.mockReturnValue('/test/packages/test-package/package.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync.mockReturnValue(JSON.stringify(packageJson));

	// Act
	bumpVersions('/test', workspaces, '2.0.0');

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/test-package/package.json',
		'{\n\t"name": "test-package",\n\t"version": "2.0.0"\n}\n',
		'utf-8'
	);
});

it.each([
	'workspace:*',
	'workspace:^',
	'catalog:',
	'catalog:react',
	'link:../package-b',
	'portal:../package-b',
	'npm:package-b@^1.0.0',
])('leaves %s specifiers for the package manager', (specifier) => {
	// Prepare
	const workspace = (name: string): Workspace => ({
		name,
		shortName: name,
		path: `/test/packages/${name}`,
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	});
	const workspaces = {
		'package-a': workspace('package-a'),
		'package-b': workspace('package-b'),
	};
	const packageJson = {
		name: 'package-a',
		version: '1.0.0',
		dependencies: { 'package-b': specifier },
		devDependencies: { 'package-b': specifier },
	};

	mocks.join.mockReturnValue('/test/packages/package-a/package.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync.mockReturnValue(JSON.stringify(packageJson));

	// Act
	bumpVersions('/test', { 'package-a': workspaces['package-a'] }, '2.0.0');

	// Assess
	const written = JSON.parse(mocks.writeFileSync.mock.calls[0]?.[1] as string);
	expect(written.dependencies['package-b']).toBe(specifier);
	expect(written.devDependencies['package-b']).toBe(specifier);
	expect(written.version).toBe('2.0.0');
});

it('adds a missing version right after the name', () => {
	// Prepare
	const workspace: Workspace = {
		name: 'package-a',
		shortName: 'package-a',
		path: '/test/packages/package-a',
		version: undefined as unknown as string,
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: true,
	};
	const packageJson = {
		name: 'package-a',
		private: true,
		type: 'module',
	};

	mocks.join.mockReturnValue('/test/packages/package-a/package.json');
	mocks.existsSync.mockReturnValue(true);
	mocks.readFileSync.mockReturnValue(JSON.stringify(packageJson, null, 2));

	// Act
	bumpVersions('/test', { 'package-a': workspace }, '0.1.0');

	// Assess
	expect(mocks.writeFileSync).toHaveBeenCalledWith(
		'/test/packages/package-a/package.json',
		'{\n  "name": "package-a",\n  "version": "0.1.0",\n  "private": true,\n  "type": "module"\n}',
		'utf-8'
	);
});
