import { it, expect, beforeEach, vi } from 'vitest';
import { getAffectedWorkspacesFromChangedFiles } from '../../src/commits.js';
import type { Workspace } from '../../src/types.js';

const mocks = vi.hoisted(() => ({
	relative: vi.fn(),
	getFileDiff: vi.fn(),
}));

vi.mock('node:path', () => ({
	relative: mocks.relative,
}));

vi.mock('../../src/git.js', () => ({
	getFileDiff: mocks.getFileDiff,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('returns affected workspaces with production dependency changes', () => {
	// Prepare
	const changedFiles = ['packages/workspace-a/package.json', 'packages/workspace-b/package.json'];
	const workspace1: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspace2: Workspace = {
		name: 'workspace-b',
		shortName: 'workspace-b',
		path: '/test/packages/workspace-b',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'workspace-a': workspace1, 'workspace-b': workspace2 };
	const rootPath = '/test';
	const commitHash = 'abc123';

	mocks.relative
		.mockReturnValueOnce('packages/workspace-a')
		.mockReturnValueOnce('packages/workspace-b');
	mocks.getFileDiff
		.mockReturnValueOnce(`
@@ -10,6 +10,7 @@
   "dependencies": {
+    "lodash": "^4.17.21",
     "react": "^18.0.0"
   }
`)
		.mockReturnValueOnce(`
@@ -15,6 +15,7 @@
   "devDependencies": {
+    "jest": "^29.0.0",
     "@types/node": "^18.0.0"
   }
`);

	// Act
	const result = getAffectedWorkspacesFromChangedFiles(changedFiles, workspaces, rootPath, commitHash);

	// Assess
	expect(result).toHaveLength(1);
	expect(result[0]).toBe(workspace1);
	expect(mocks.getFileDiff).toHaveBeenCalledWith('/test', 'abc123', 'packages/workspace-a/package.json');
	expect(mocks.getFileDiff).toHaveBeenCalledWith('/test', 'abc123', 'packages/workspace-b/package.json');
});

it('filters out non-package.json files', () => {
	// Prepare
	const changedFiles = [
		'packages/workspace-a/package.json',
		'packages/workspace-a/src/index.ts',
		'packages/workspace-a/README.md',
		'packages/workspace-b/package.json'
	];
	const workspace1: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspace2: Workspace = {
		name: 'workspace-b',
		shortName: 'workspace-b',
		path: '/test/packages/workspace-b',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'workspace-a': workspace1, 'workspace-b': workspace2 };
	const rootPath = '/test';
	const commitHash = 'abc123';

	mocks.relative
		.mockReturnValueOnce('packages/workspace-a')
		.mockReturnValueOnce('packages/workspace-b');
	mocks.getFileDiff
		.mockReturnValueOnce(`@@ -10,6 +10,7 @@
   "dependencies": {
+    "lodash": "^4.17.21",
     "react": "^18.0.0"
   }`)
		.mockReturnValueOnce(`@@ -15,6 +15,7 @@
   "devDependencies": {
+    "jest": "^29.0.0",
     "@types/node": "^18.0.0"
   }`);

	// Act
	const result = getAffectedWorkspacesFromChangedFiles(changedFiles, workspaces, rootPath, commitHash);

	// Assess
	expect(result).toHaveLength(1);
	expect(mocks.getFileDiff).toHaveBeenCalledTimes(2); // Called for both package.json files
});

it('skips root package.json', () => {
	// Prepare
	const changedFiles = ['package.json', 'packages/workspace-a/package.json'];
	const workspace1: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';
	const commitHash = 'abc123';

	mocks.relative.mockReturnValue('packages/workspace-a');
	mocks.getFileDiff.mockReturnValue(`
@@ -10,6 +10,7 @@
   "dependencies": {
+    "lodash": "^4.17.21",
     "react": "^18.0.0"
   }
`);

	// Act
	const result = getAffectedWorkspacesFromChangedFiles(changedFiles, workspaces, rootPath, commitHash);

	// Assess
	expect(result).toHaveLength(1);
	expect(mocks.getFileDiff).toHaveBeenCalledTimes(1);
	expect(mocks.getFileDiff).toHaveBeenCalledWith('/test', 'abc123', 'packages/workspace-a/package.json');
});

it('skips private workspaces', () => {
	// Prepare
	const changedFiles = ['packages/private-workspace/package.json'];
	const privateWorkspace: Workspace = {
		name: 'private-workspace',
		shortName: 'private-workspace',
		path: '/test/packages/private-workspace',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: true,
	};
	const workspaces = { 'private-workspace': privateWorkspace };
	const rootPath = '/test';
	const commitHash = 'abc123';

	mocks.relative.mockReturnValue('packages/private-workspace');

	// Act
	const result = getAffectedWorkspacesFromChangedFiles(changedFiles, workspaces, rootPath, commitHash);

	// Assess
	expect(result).toHaveLength(0);
	expect(mocks.getFileDiff).not.toHaveBeenCalled();
});

it('returns empty array when no matching workspaces found', () => {
	// Prepare
	const changedFiles = ['packages/unknown-workspace/package.json'];
	const workspace1: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';
	const commitHash = 'abc123';

	// Act
	const result = getAffectedWorkspacesFromChangedFiles(changedFiles, workspaces, rootPath, commitHash);

	// Assess
	expect(result).toHaveLength(0);
	expect(mocks.getFileDiff).not.toHaveBeenCalled();
});

it('excludes workspaces without production dependency changes', () => {
	// Prepare
	const changedFiles = ['packages/workspace-a/package.json'];
	const workspace1: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';
	const commitHash = 'abc123';

	mocks.relative.mockReturnValue('packages/workspace-a');
	mocks.getFileDiff.mockReturnValue(`
@@ -15,6 +15,7 @@
   "devDependencies": {
+    "jest": "^29.0.0",
     "@types/node": "^18.0.0"
   }
`);

	// Act
	const result = getAffectedWorkspacesFromChangedFiles(changedFiles, workspaces, rootPath, commitHash);

	// Assess
	expect(result).toHaveLength(0);
	expect(mocks.getFileDiff).toHaveBeenCalledWith('/test', 'abc123', 'packages/workspace-a/package.json');
});

it('handles empty changed files array', () => {
	// Prepare
	const changedFiles: string[] = [];
	const workspace1: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';
	const commitHash = 'abc123';

	// Act
	const result = getAffectedWorkspacesFromChangedFiles(changedFiles, workspaces, rootPath, commitHash);

	// Assess
	expect(result).toHaveLength(0);
	expect(mocks.getFileDiff).not.toHaveBeenCalled();
});

it('handles multiple workspaces with mixed results', () => {
	// Prepare
	const changedFiles = [
		'packages/workspace-a/package.json',
		'packages/workspace-b/package.json',
		'packages/private-workspace/package.json'
	];
	const workspace1: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspace2: Workspace = {
		name: 'workspace-b',
		shortName: 'workspace-b',
		path: '/test/packages/workspace-b',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const privateWorkspace: Workspace = {
		name: 'private-workspace',
		shortName: 'private-workspace',
		path: '/test/packages/private-workspace',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: true,
	};
	const workspaces = { 
		'workspace-a': workspace1, 
		'workspace-b': workspace2,
		'private-workspace': privateWorkspace
	};
	const rootPath = '/test';
	const commitHash = 'abc123';

	mocks.relative.mockImplementation((rootPath: string, workspacePath: string) => {
		if (workspacePath.includes('workspace-a')) return 'packages/workspace-a';
		if (workspacePath.includes('workspace-b')) return 'packages/workspace-b';
		if (workspacePath.includes('private-workspace')) return 'packages/private-workspace';
		return '';
	});
	mocks.getFileDiff
		.mockReturnValueOnce(`
@@ -10,6 +10,7 @@
   "dependencies": {
+    "lodash": "^4.17.21",
     "react": "^18.0.0"
   }
`)
		.mockReturnValueOnce(`
@@ -15,6 +15,7 @@
   "devDependencies": {
+    "jest": "^29.0.0",
     "@types/node": "^18.0.0"
   }
`);

	// Act
	const result = getAffectedWorkspacesFromChangedFiles(changedFiles, workspaces, rootPath, commitHash);

	// Assess
	expect(result).toHaveLength(1);
	expect(result[0]).toBe(workspace1);
	expect(mocks.getFileDiff).toHaveBeenCalledTimes(2); // Only workspace-a and workspace-b (private is skipped)
});