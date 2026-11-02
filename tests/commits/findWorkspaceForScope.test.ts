import { expect, it } from 'vitest';
import { findWorkspaceForScope } from '../../src/commits.js';
import type { Workspace } from '../../src/types.js';

const workspace = (name: string, path: string): Workspace => ({
	name,
	shortName: name.split('/').pop() as string,
	path,
	version: '1.0.0',
	changed: false,
	commits: [],
	dependencyNames: [],
	isPrivate: false,
});

const plugin = workspace('@scope/tool-plugin', '/repo/packages/plugin');
const core = workspace('core', '/repo/packages/core');
const workspaces = { 'tool-plugin': plugin, core };

it('matches a scope to the short name', () => {
	// Act & Assess
	expect(findWorkspaceForScope('tool-plugin', workspaces)).toBe(plugin);
});

it('matches a scope to the directory name', () => {
	// Act & Assess
	expect(findWorkspaceForScope('plugin', workspaces)).toBe(plugin);
});

it('prefers a short name match over a directory match', () => {
	// Prepare
	const named = workspace('plugin', '/repo/packages/other');

	// Act & Assess
	expect(
		findWorkspaceForScope('plugin', { ...workspaces, plugin: named })
	).toBe(named);
});

it('matches Windows paths and trailing separators', () => {
	// Prepare
	const windows = workspace('@scope/win', 'C:\\repo\\packages\\win-dir\\');

	// Act & Assess
	expect(findWorkspaceForScope('win-dir', { win: windows })).toBe(windows);
});

it('returns undefined when nothing matches', () => {
	// Act & Assess
	expect(findWorkspaceForScope('deps', workspaces)).toBeUndefined();
});
