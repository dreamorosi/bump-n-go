import { beforeEach, describe, expect, it } from 'vitest';
import { parseCommits } from '../../src/commits.js';
import type { RawCommit, Workspace } from '../../src/types.js';

describe('parseCommits with version bump commits', () => {
	let workspaces: Record<string, Workspace>;
	const rootPath = '/test';

	// Set up test data
	beforeEach(() => {
		workspaces = {
			'test-pkg': {
				name: 'test-pkg',
				shortName: 'test-pkg',
				path: `${rootPath}/test-pkg`,
				version: '1.0.0',
				changed: false,
				commits: [],
				dependencyNames: [],
				isPrivate: false,
			},
		};
	});

	it('excludes version bump commits from parsed commits', () => {
		const commits: RawCommit[] = [
			{
				hash: 'abc123',
				subject: 'feat(test-pkg): add new feature',
				body: 'This is a feature commit',
			},
			{
				hash: 'def456',
				subject: 'chore: bump version to 1.0.0',
				body: 'This is a version bump commit',
			},
			{
				hash: 'ghi789',
				subject: 'fix(test-pkg): fix a bug',
				body: 'This is a bugfix commit',
			},
		];

		const result = parseCommits(commits, workspaces, rootPath);

		// The workspace should be changed
		expect(result.workspaceChanged).toBe(true);

		// Get the processed workspace
		const processedWorkspace = result.workspaces['test-pkg'];

		// There should only be two commits (feature and bugfix, not version bump)
		expect(processedWorkspace.commits).toHaveLength(2);

		// Check commit types
		const commitTypes = processedWorkspace.commits.map((c) => c.type);
		expect(commitTypes).toContain('feat');
		expect(commitTypes).toContain('fix');

		// Version bump commit should not be included
		const versionBumpCommit = processedWorkspace.commits.find(
			(c) => c.type === 'chore' && c.subject.startsWith('bump version')
		);
		expect(versionBumpCommit).toBeUndefined();
	});

	it('handles single-package repo correctly with version bump commits', () => {
		// Create single package repo setup
		const singlePkgWorkspaces = {
			'root-pkg': {
				name: 'root-pkg',
				shortName: 'root-pkg',
				path: rootPath,
				version: '1.0.0',
				changed: false,
				commits: [],
				dependencyNames: [],
				isPrivate: false,
			},
		};

		const commits: RawCommit[] = [
			{
				hash: 'abc123',
				subject: 'feat: add new feature',
				body: 'This is a feature commit',
			},
			{
				hash: 'def456',
				subject: 'chore: bump version to 1.0.0',
				body: 'This is a version bump commit',
			},
		];

		const result = parseCommits(commits, singlePkgWorkspaces, rootPath);

		// The workspace should be changed
		expect(result.workspaceChanged).toBe(true);

		// Get the processed workspace
		const processedWorkspace = result.workspaces['root-pkg'];

		// There should only be one commit (feature, not version bump)
		expect(processedWorkspace.commits).toHaveLength(1);

		// Check commit types
		expect(processedWorkspace.commits[0].type).toBe('feat');
	});
});
