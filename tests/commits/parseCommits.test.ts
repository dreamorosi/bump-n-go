import { it, expect, beforeEach, vi } from 'vitest';
import { parseCommits } from '../../src/commits.js';
import type { RawCommit, Workspace } from '../../src/types.js';

const mocks = vi.hoisted(() => ({
	getChangedFiles: vi.fn(),
	getFileDiff: vi.fn(),
	relative: vi.fn(),
}));

vi.mock('../../src/git.js', () => ({
	getChangedFiles: mocks.getChangedFiles,
	getFileDiff: mocks.getFileDiff,
}));

vi.mock('node:path', () => ({
	relative: mocks.relative,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('parses commits and updates matching workspaces', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'feat(workspace-a): add new feature',
			body: 'This is a new feature for workspace-a',
		},
		{
			hash: 'def456',
			subject: 'fix(workspace-b): fix critical bug',
			body: 'Fixed a critical bug in workspace-b',
		},
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

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaceChanged).toBe(true);
	expect(result.workspaces['workspace-a'].changed).toBe(true);
	expect(result.workspaces['workspace-a'].commits).toHaveLength(1);
	expect(result.workspaces['workspace-a'].commits[0]).toEqual({
		subject: 'add new feature',
		type: 'feat',
		scope: 'workspace-a',
		notes: [],
		breaking: false,
		hash: 'abc123',
	});
	expect(result.workspaces['workspace-b'].changed).toBe(true);
	expect(result.workspaces['workspace-b'].commits).toHaveLength(1);
	expect(result.workspaces['workspace-b'].commits[0]).toEqual({
		subject: 'fix critical bug',
		type: 'fix',
		scope: 'workspace-b',
		notes: [],
		breaking: false,
		hash: 'def456',
	});
});

it('ignores commits with invalid format', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'invalid commit message format',
			body: '',
		},
		{
			hash: 'def456',
			subject: 'feat(workspace-a): valid commit',
			body: '',
		},
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
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaces['workspace-a'].commits).toHaveLength(1);
	expect(result.workspaces['workspace-a'].commits[0].subject).toBe('valid commit');
});

it('ignores commits with disallowed types', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'invalid(workspace-a): invalid commit type',
			body: '',
		},
		{
			hash: 'def456',
			subject: 'feat(workspace-a): valid commit',
			body: '',
		},
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
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaces['workspace-a'].commits).toHaveLength(1);
	expect(result.workspaces['workspace-a'].commits[0].subject).toBe('valid commit');
});

it('ignores commits for non-existent workspaces', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'feat(non-existent): commit for missing workspace',
			body: '',
		},
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
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaceChanged).toBe(false);
	expect(result.workspaces['workspace-a'].changed).toBe(false);
	expect(result.workspaces['workspace-a'].commits).toHaveLength(0);
});

it('detects breaking changes from notes', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'feat(workspace-a): add breaking feature',
			body: 'This feature has breaking changes.\n\nBREAKING CHANGE: API has changed significantly',
		},
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
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaces['workspace-a'].commits[0].breaking).toBe(true);
	expect(result.workspaces['workspace-a'].commits[0].notes).toHaveLength(1);
	expect(result.workspaces['workspace-a'].commits[0].notes[0].title).toBe('BREAKING CHANGE');
});

it('handles dependabot group commits', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'chore(deps): bump the production group with 5 updates',
			body: 'Updates multiple dependencies',
		},
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
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';

	mocks.getChangedFiles.mockReturnValue(['packages/workspace-a/package.json']);
	mocks.relative.mockReturnValue('packages/workspace-a');
	mocks.getFileDiff.mockReturnValue(`
@@ -10,6 +10,7 @@
   "dependencies": {
+    "lodash": "^4.17.21",
     "react": "^18.0.0"
   }
`);

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaceChanged).toBe(true);
	expect(result.workspaces['workspace-a'].changed).toBe(true);
	expect(result.workspaces['workspace-a'].commits).toHaveLength(1);
	expect(mocks.getChangedFiles).toHaveBeenCalledWith('/test', 'abc123');
});

it('handles individual dependency updates', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'chore(deps): bump lodash from 4.17.20 to 4.17.21',
			body: 'Bumps lodash to latest version',
		},
	];
	const workspace1: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: ['lodash', 'react'],
		isPrivate: false,
	};
	const workspace2: Workspace = {
		name: 'workspace-b',
		shortName: 'workspace-b',
		path: '/test/packages/workspace-b',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: ['axios'],
		isPrivate: false,
	};
	const workspaces = { 'workspace-a': workspace1, 'workspace-b': workspace2 };
	const rootPath = '/test';

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaceChanged).toBe(true);
	expect(result.workspaces['workspace-a'].changed).toBe(true);
	expect(result.workspaces['workspace-a'].commits).toHaveLength(1);
	expect(result.workspaces['workspace-b'].changed).toBe(false);
	expect(result.workspaces['workspace-b'].commits).toHaveLength(0);
});

it('skips private workspaces for dependency updates', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'chore(deps): bump lodash from 4.17.20 to 4.17.21',
			body: 'Bumps lodash to latest version',
		},
	];
	const privateWorkspace: Workspace = {
		name: 'private-workspace',
		shortName: 'private-workspace',
		path: '/test/packages/private-workspace',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: ['lodash'],
		isPrivate: true,
	};
	const workspaces = { 'private-workspace': privateWorkspace };
	const rootPath = '/test';

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaceChanged).toBe(false);
	expect(result.workspaces['private-workspace'].changed).toBe(false);
	expect(result.workspaces['private-workspace'].commits).toHaveLength(0);
});

it('returns false for workspaceChanged when no workspaces are affected', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'feat(non-existent): commit for missing workspace',
			body: '',
		},
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
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaceChanged).toBe(false);
});

it('handles commits with breaking change indicator in header', () => {
	// Prepare
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'feat(workspace-a)!: breaking feature',
			body: 'This feature has breaking changes',
		},
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
	const workspaces = { 'workspace-a': workspace1 };
	const rootPath = '/test';

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaces['workspace-a'].commits[0].breaking).toBe(true);
});

it('handles empty commits array', () => {
	// Prepare
	const commits: RawCommit[] = [];
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

	// Act
	const result = parseCommits(commits, workspaces, rootPath);

	// Assess
	expect(result.workspaceChanged).toBe(false);
	expect(result.workspaces['workspace-a'].changed).toBe(false);
	expect(result.workspaces['workspace-a'].commits).toHaveLength(0);
});