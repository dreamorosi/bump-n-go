import { beforeEach, expect, it, vi } from 'vitest';
import { processMonorepo } from '../src/index.js';
import type { RawCommit, Workspace } from '../src/types.js';

const mocks = vi.hoisted(() => ({
	readFileSync: vi.fn(),
	join: vi.fn(),
	getLastTag: vi.fn(),
	getCommitsSinceTag: vi.fn(),
	getFirstCommit: vi.fn(),
	readWorkspaces: vi.fn(),
	parseCommits: vi.fn(),
	determineVersionBumpType: vi.fn(),
	updateChangelogs: vi.fn(),
	bumpVersions: vi.fn(),
	configureLogger: vi.fn(),
	logger: {
		error: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock('node:fs', () => ({
	readFileSync: mocks.readFileSync,
}));

vi.mock('node:path', () => ({
	join: mocks.join,
}));

vi.mock('../src/git.js', () => ({
	getLastTag: mocks.getLastTag,
	getCommitsSinceTag: mocks.getCommitsSinceTag,
	getFirstCommit: mocks.getFirstCommit,
}));

vi.mock('../src/workspace.js', () => ({
	readWorkspaces: mocks.readWorkspaces,
}));

vi.mock('../src/commits.js', () => ({
	parseCommits: mocks.parseCommits,
}));

vi.mock('../src/bump.js', () => ({
	determineVersionBumpType: mocks.determineVersionBumpType,
}));

vi.mock('../src/changelog.js', () => ({
	updateChangelogs: mocks.updateChangelogs,
}));

vi.mock('../src/version.js', () => ({
	bumpVersions: mocks.bumpVersions,
}));

vi.mock('../src/logger.js', () => ({
	configureLogger: mocks.configureLogger,
	logger: mocks.logger,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

it('returns early for invalid version bump type', async () => {
	// Prepare
	const options = {
		root: '/test',
		type: 'invalid',
		verbose: false,
	};

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.logger.error).toHaveBeenCalledWith(
		'Invalid type provided: invalid. Valid types are: major, minor, patch'
	);
	expect(mocks.getLastTag).not.toHaveBeenCalled();
});

it('returns early when no changes detected and no type provided', async () => {
	// Prepare
	const options = {
		root: '/test',
		verbose: false,
	};
	const commits: RawCommit[] = [];
	const workspaces: Record<string, Workspace> = {};

	mocks.getLastTag.mockReturnValue('v1.0.0');
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: false,
		workspaces,
	});

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.logger.info).toHaveBeenCalledWith(
		'No changes detected in workspaces and no version bump type provided; skipping version bump'
	);
	expect(mocks.updateChangelogs).not.toHaveBeenCalled();
	expect(mocks.bumpVersions).not.toHaveBeenCalled();
});

it('handles dry run mode correctly', async () => {
	// Prepare
	const options = {
		root: '/test',
		dryRun: true,
		type: 'patch',
		verbose: false,
	};
	const commits: RawCommit[] = [];
	const workspaces: Record<string, Workspace> = {};

	mocks.getLastTag.mockReturnValue('v1.0.0');
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: true,
		workspaces,
	});

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.logger.info).toHaveBeenCalledWith('New version: 1.0.1');
	expect(mocks.logger.info).toHaveBeenCalledWith(
		'Dry run enabled, no changes will be made'
	);
	expect(mocks.updateChangelogs).not.toHaveBeenCalled();
	expect(mocks.bumpVersions).not.toHaveBeenCalled();
});

it('processes monorepo successfully with provided version type', async () => {
	// Prepare
	const options = {
		root: '/test',
		type: 'minor',
		verbose: true,
	};
	const commits: RawCommit[] = [
		{
			hash: 'abc123',
			subject: 'feat(workspace-a): add new feature',
			body: '',
		},
	];
	const workspace: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'add new feature',
				type: 'feat',
				scope: 'workspace-a',
				breaking: false,
				notes: [],
				hash: 'abc123',
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'workspace-a': workspace };

	mocks.getLastTag.mockReturnValue('v1.0.0');
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: true,
		workspaces,
	});
	mocks.join.mockReturnValue('/test/package.json');
	mocks.readFileSync.mockReturnValue(
		JSON.stringify({
			name: 'test-monorepo',
			repository: {
				url: 'git+https://github.com/user/repo.git',
			},
		})
	);

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.logger.info).toHaveBeenCalledWith(
		'Version bump type provided: minor'
	);
	expect(mocks.logger.info).toHaveBeenCalledWith('New version: 1.1.0');
	expect(mocks.updateChangelogs).toHaveBeenCalledWith(
		'/test',
		workspaces,
		'1.1.0',
		'https://github.com/user/repo/compare/v1.0.0...v1.1.0',
		'https://github.com/user/repo'
	);
	expect(mocks.bumpVersions).toHaveBeenCalledWith('/test', workspaces, '1.1.0');
	expect(mocks.logger.info).toHaveBeenCalledWith('Updated changelogs');
	expect(mocks.logger.info).toHaveBeenCalledWith(
		'Bumped all package versions to 1.1.0'
	);
});

it('determines version bump type from commits when not provided', async () => {
	// Prepare
	const options = {
		root: '/test',
		verbose: false,
	};
	const commits: RawCommit[] = [];
	const workspace1: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspace2: Workspace = {
		name: 'workspace-b',
		shortName: 'workspace-b',
		path: '/test/packages/workspace-b',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'workspace-a': workspace1, 'workspace-b': workspace2 };

	mocks.getLastTag.mockReturnValue('v1.0.0');
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: true,
		workspaces,
	});
	mocks.determineVersionBumpType
		.mockReturnValueOnce('patch')
		.mockReturnValueOnce('major');
	mocks.join.mockReturnValue('/test/package.json');
	mocks.readFileSync.mockReturnValue(
		JSON.stringify({
			name: 'test-monorepo',
			repository: {
				url: 'https://github.com/user/repo.git',
			},
		})
	);

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.determineVersionBumpType).toHaveBeenCalledTimes(2);
	expect(mocks.logger.info).toHaveBeenCalledWith(
		'Determined version bump type: major'
	);
	expect(mocks.logger.info).toHaveBeenCalledWith('New version: 2.0.0');
});

it('handles prerelease versions correctly', async () => {
	// Prepare
	const options = {
		root: '/test',
		type: 'minor',
		verbose: false,
	};
	const commits: RawCommit[] = [];
	const workspaces: Record<string, Workspace> = {};

	mocks.getLastTag.mockReturnValue('v1.0.0-alpha.1');
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: true,
		workspaces,
	});
	mocks.join.mockReturnValue('/test/package.json');
	mocks.readFileSync.mockReturnValue(
		JSON.stringify({
			name: 'test-monorepo',
			repository: {
				url: 'git+https://github.com/user/repo.git',
			},
		})
	);

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.logger.info).toHaveBeenCalledWith('New version: 1.1.0-alpha');
});

it('handles no last tag scenario', async () => {
	// Prepare
	const options = {
		root: '/test',
		type: 'patch',
		verbose: false,
	};
	const commits: RawCommit[] = [];
	const workspaces: Record<string, Workspace> = {};

	mocks.getLastTag.mockReturnValue(null);
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: true,
		workspaces,
	});
	mocks.getFirstCommit.mockReturnValue('abc123');
	mocks.join.mockReturnValue('/test/package.json');
	mocks.readFileSync.mockReturnValue(
		JSON.stringify({
			name: 'test-monorepo',
			repository: {
				url: 'git+https://github.com/user/repo.git',
			},
		})
	);

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.logger.info).toHaveBeenCalledWith('New version: 0.0.1');
	expect(mocks.updateChangelogs).toHaveBeenCalledWith(
		'/test',
		workspaces,
		'0.0.1',
		'https://github.com/user/repo/compare/abc123...v0.0.1',
		'https://github.com/user/repo'
	);
});

it('handles no first commit scenario', async () => {
	// Prepare
	const options = {
		root: '/test',
		type: 'patch',
		verbose: false,
	};
	const commits: RawCommit[] = [];
	const workspaces: Record<string, Workspace> = {};

	mocks.getLastTag.mockReturnValue(null);
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: true,
		workspaces,
	});
	mocks.getFirstCommit.mockReturnValue(null);
	mocks.join.mockReturnValue('/test/package.json');
	mocks.readFileSync.mockReturnValue(
		JSON.stringify({
			name: 'test-monorepo',
			repository: {
				url: 'git+https://github.com/user/repo.git',
			},
		})
	);

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.updateChangelogs).toHaveBeenCalledWith(
		'/test',
		workspaces,
		'0.0.1',
		'https://github.com/user/repo/releases/tag/v0.0.1',
		'https://github.com/user/repo'
	);
});

it('handles repository URL cleanup correctly', async () => {
	// Prepare
	const options = {
		root: '/test',
		type: 'patch',
		verbose: false,
	};
	const commits: RawCommit[] = [];
	const workspaces: Record<string, Workspace> = {};

	mocks.getLastTag.mockReturnValue('v1.0.0');
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: true,
		workspaces,
	});
	mocks.join.mockReturnValue('/test/package.json');
	mocks.readFileSync.mockReturnValue(
		JSON.stringify({
			name: 'test-monorepo',
			repository: {
				url: 'git+https://github.com/user/repo.git',
			},
		})
	);

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.updateChangelogs).toHaveBeenCalledWith(
		'/test',
		workspaces,
		'1.0.1',
		'https://github.com/user/repo/compare/v1.0.0...v1.0.1',
		'https://github.com/user/repo'
	);
});

it('handles missing repository URL', async () => {
	// Prepare
	const options = {
		root: '/test',
		type: 'patch',
		verbose: false,
	};
	const commits: RawCommit[] = [];
	const workspaces: Record<string, Workspace> = {};

	mocks.getLastTag.mockReturnValue('v1.0.0');
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: true,
		workspaces,
	});
	mocks.join.mockReturnValue('/test/package.json');
	mocks.readFileSync.mockReturnValue(
		JSON.stringify({
			name: 'test-monorepo',
		})
	);

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.updateChangelogs).toHaveBeenCalledWith(
		'/test',
		workspaces,
		'1.0.1',
		'/compare/v1.0.0...v1.0.1',
		''
	);
});

it('skips unchanged workspaces when determining bump type', async () => {
	// Prepare
	const options = {
		root: '/test',
		verbose: false,
	};
	const commits: RawCommit[] = [];
	const changedWorkspace: Workspace = {
		name: 'workspace-a',
		shortName: 'workspace-a',
		path: '/test/packages/workspace-a',
		version: '1.0.0',
		changed: true,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const unchangedWorkspace: Workspace = {
		name: 'workspace-b',
		shortName: 'workspace-b',
		path: '/test/packages/workspace-b',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = {
		'workspace-a': changedWorkspace,
		'workspace-b': unchangedWorkspace,
	};

	mocks.getLastTag.mockReturnValue('v1.0.0');
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: true,
		workspaces,
	});
	mocks.determineVersionBumpType.mockReturnValue('minor');
	mocks.join.mockReturnValue('/test/package.json');
	mocks.readFileSync.mockReturnValue(
		JSON.stringify({
			name: 'test-monorepo',
			repository: {
				url: 'https://github.com/user/repo.git',
			},
		})
	);

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.determineVersionBumpType).toHaveBeenCalledTimes(1);
	expect(mocks.logger.info).toHaveBeenCalledWith(
		'Determined version bump type: minor'
	);
});

it('skips version bump when no workspace changes and no type provided', async () => {
	// Prepare
	const options = {
		root: '/test',
		verbose: false,
	};
	const commits: RawCommit[] = [
		{ hash: 'abc123', subject: 'feat: add feature', body: '' },
	];
	const workspaces: Record<string, Workspace> = {};

	mocks.getLastTag.mockReturnValue(null);
	mocks.getCommitsSinceTag.mockReturnValue(commits);
	mocks.readWorkspaces.mockReturnValue(workspaces);
	mocks.parseCommits.mockReturnValue({
		workspaceChanged: false,
		workspaces,
	});

	// Act
	await processMonorepo(options);

	// Assess
	expect(mocks.logger.info).toHaveBeenCalledWith(
		'No changes detected in workspaces and no version bump type provided; skipping version bump'
	);
	expect(mocks.updateChangelogs).not.toHaveBeenCalled();
	expect(mocks.bumpVersions).not.toHaveBeenCalled();
});

