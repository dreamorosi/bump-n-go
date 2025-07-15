import { expect, it } from 'vitest';
import { generateChangelogSections } from '../../src/changelog.js';
import type { Workspace } from '../../src/types.js';

it('generates sections for public packages only in main changelog', () => {
	// Prepare
	const publicWorkspace: Workspace = {
		name: 'public-package',
		shortName: 'public-package',
		path: '/test/packages/public-package',
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
	const privateWorkspace: Workspace = {
		name: 'private-package',
		shortName: 'private-package',
		path: '/test/packages/private-package',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Fix private bug',
				type: 'fix',
				scope: 'internal',
				breaking: false,
				notes: [],
				hash: 'def5678',
			},
		],
		dependencyNames: [],
		isPrivate: true,
	};
	const workspaces = {
		'public-package': publicWorkspace,
		'private-package': privateWorkspace,
	};
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = generateChangelogSections(workspaces, baseUrl);

	// Assess
	expect(result.mainSections).toContain('### Features');
	expect(result.mainSections).toContain(
		'**public-package** Add new feature ([abc1234](https://github.com/user/repo/commit/abc1234))'
	);
	expect(result.mainSections).not.toContain('private-package');
	expect(result.mainSections).not.toContain('Fix private bug');
});

it('includes all packages in workspace sections', () => {
	// Prepare
	const publicWorkspace: Workspace = {
		name: 'public-package',
		shortName: 'public-package',
		path: '/test/packages/public-package',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Add feature',
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
	const privateWorkspace: Workspace = {
		name: 'private-package',
		shortName: 'private-package',
		path: '/test/packages/private-package',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Fix bug',
				type: 'fix',
				scope: 'internal',
				breaking: false,
				notes: [],
				hash: 'def5678',
			},
		],
		dependencyNames: [],
		isPrivate: true,
	};
	const workspaces = {
		'public-package': publicWorkspace,
		'private-package': privateWorkspace,
	};
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = generateChangelogSections(workspaces, baseUrl);

	// Assess
	expect(result.workspaceSections.has('public-package')).toBe(true);
	expect(result.workspaceSections.has('private-package')).toBe(true);

	const publicSections = result.workspaceSections.get('public-package');
	expect(publicSections?.has('Features')).toBe(true);
	expect(publicSections?.get('Features')).toContain(
		'- Add feature ([abc1234](https://github.com/user/repo/commit/abc1234))'
	);

	const privateSections = result.workspaceSections.get('private-package');
	expect(privateSections?.has('Bug Fixes')).toBe(true);
	expect(privateSections?.get('Bug Fixes')).toContain(
		'- Fix bug ([def5678](https://github.com/user/repo/commit/def5678))'
	);
});

it('skips unchanged workspaces', () => {
	// Prepare
	const changedWorkspace: Workspace = {
		name: 'changed-package',
		shortName: 'changed-package',
		path: '/test/packages/changed-package',
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
	const unchangedWorkspace: Workspace = {
		name: 'unchanged-package',
		shortName: 'unchanged-package',
		path: '/test/packages/unchanged-package',
		version: '1.0.0',
		changed: false,
		commits: [],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = {
		'changed-package': changedWorkspace,
		'unchanged-package': unchangedWorkspace,
	};
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = generateChangelogSections(workspaces, baseUrl);

	// Assess
	expect(result.mainSections).toContain('changed-package');
	expect(result.mainSections).not.toContain('unchanged-package');
	expect(result.workspaceSections.has('changed-package')).toBe(true);
	expect(result.workspaceSections.has('unchanged-package')).toBe(false);
});

it('groups commits by type correctly', () => {
	// Prepare
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
			},
			{
				subject: 'Fix bug',
				type: 'fix',
				scope: 'core',
				breaking: false,
				notes: [],
			},
			{
				subject: 'Add another feature',
				type: 'feat',
				scope: 'ui',
				breaking: false,
				notes: [],
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'test-package': workspace };
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = generateChangelogSections(workspaces, baseUrl);

	// Assess
	expect(result.mainSections).toContain('### Features');
	expect(result.mainSections).toContain('### Bug Fixes');
	expect(result.mainSections).toContain('Add new feature');
	expect(result.mainSections).toContain('Add another feature');
	expect(result.mainSections).toContain('Fix bug');
});

it('handles empty workspaces', () => {
	// Prepare
	const workspaces: Record<string, Workspace> = {};
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = generateChangelogSections(workspaces, baseUrl);

	// Assess
	expect(result.mainSections).toBe('');
	expect(result.workspaceSections.size).toBe(0);
});

it('handles commits without hash', () => {
	// Prepare
	const workspace: Workspace = {
		name: 'test-package',
		shortName: 'test-package',
		path: '/test/packages/test-package',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Add feature without hash',
				type: 'feat',
				scope: 'core',
				breaking: false,
				notes: [],
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'test-package': workspace };
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = generateChangelogSections(workspaces, baseUrl);

	// Assess
	expect(result.mainSections).toContain('Add feature without hash');
	expect(result.mainSections).not.toContain('commit/');
});

it('omits package name prefix in single-package repository', () => {
	// Prepare
	const workspace: Workspace = {
		name: 'single-package',
		shortName: 'single-package',
		path: '/test/single-package',
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
			{
				subject: 'Fix bug',
				type: 'fix',
				scope: 'core',
				breaking: false,
				notes: [],
				hash: 'def5678',
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = { 'single-package': workspace };
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = generateChangelogSections(workspaces, baseUrl);

	// Assess
	expect(result.mainSections).toContain('### Features');
	expect(result.mainSections).toContain('### Bug Fixes');
	expect(result.mainSections).toContain(
		'- Add new feature ([abc1234](https://github.com/user/repo/commit/abc1234))'
	);
	expect(result.mainSections).toContain(
		'- Fix bug ([def5678](https://github.com/user/repo/commit/def5678))'
	);
	expect(result.mainSections).not.toContain('**single-package**');
});

it('includes package name prefix in monorepo with multiple packages', () => {
	// Prepare
	const workspace1: Workspace = {
		name: 'package-1',
		shortName: 'package-1',
		path: '/test/packages/package-1',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Add feature to package 1',
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
	const workspace2: Workspace = {
		name: 'package-2',
		shortName: 'package-2',
		path: '/test/packages/package-2',
		version: '1.0.0',
		changed: true,
		commits: [
			{
				subject: 'Fix bug in package 2',
				type: 'fix',
				scope: 'core',
				breaking: false,
				notes: [],
				hash: 'def5678',
			},
		],
		dependencyNames: [],
		isPrivate: false,
	};
	const workspaces = {
		'package-1': workspace1,
		'package-2': workspace2,
	};
	const baseUrl = 'https://github.com/user/repo';

	// Act
	const result = generateChangelogSections(workspaces, baseUrl);

	// Assess
	expect(result.mainSections).toContain('### Features');
	expect(result.mainSections).toContain('### Bug Fixes');
	expect(result.mainSections).toContain(
		'- **package-1** Add feature to package 1 ([abc1234](https://github.com/user/repo/commit/abc1234))'
	);
	expect(result.mainSections).toContain(
		'- **package-2** Fix bug in package 2 ([def5678](https://github.com/user/repo/commit/def5678))'
	);
});
