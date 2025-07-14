import { describe, expect, it } from 'vitest';
import { determineVersionBumpType } from '../../src/bump.js';
import type { CommitType, ParsedCommit } from '../../src/types.js';

describe('determineVersionBumpType', () => {
	// Helper function to create test commits
	const commit = (type: string, breaking = false): ParsedCommit => ({
		subject: 'test commit',
		type: type as CommitType,
		scope: '',
		breaking,
		notes: [],
		hash: 'abc123',
	});

	describe('major version bump (breaking changes)', () => {
		it('returns major when any commit has breaking change flag', () => {
			const commits = [
				commit('feat'),
				commit('fix', true), // Breaking
				commit('docs'),
			];

			expect(determineVersionBumpType(commits)).toBe('major');
		});

		it('ignores breaking notes if breaking flag is false', () => {
			const commits = [
				commit('chore'),
				{
					...commit('fix'),
					notes: [
						{ title: 'BREAKING CHANGE', text: 'This is a breaking change' },
					],
					breaking: false,
				},
			];

			expect(determineVersionBumpType(commits)).toBe('patch');
		});

		it('prioritizes breaking changes over minor changes', () => {
			const commits = [
				commit('feat'), // Minor
				commit('chore', true), // Breaking but typically patch
			];

			expect(determineVersionBumpType(commits)).toBe('major');
		});
	});

	describe('minor version bump (features)', () => {
		it.each([
			[['feat'], 'feature type'],
			[['feature'], 'alternate feature name'],
			[['improv'], 'improvement type'],
		])('returns minor for %s', (types, _description) => {
			const commits = types.map((type) => commit(type));
			expect(determineVersionBumpType(commits)).toBe('minor');
		});

		it('returns minor when mixed with patch changes', () => {
			const commits = [
				commit('docs'), // Patch
				commit('fix'), // Patch
				commit('feat'), // Minor
				commit('style'), // Patch
			];

			expect(determineVersionBumpType(commits)).toBe('minor');
		});
	});

	describe('patch version bump', () => {
		it('returns patch for patch-only change types', () => {
			const commits = [commit('fix'), commit('docs'), commit('style')];

			expect(determineVersionBumpType(commits)).toBe('patch');
		});

		it('returns patch for CI/build changes', () => {
			const commits = [commit('chore'), commit('build'), commit('ci')];

			expect(determineVersionBumpType(commits)).toBe('patch');
		});

		it('returns patch when no commits are provided', () => {
			expect(determineVersionBumpType([])).toBe('patch');
		});
	});
});
