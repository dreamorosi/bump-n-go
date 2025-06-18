import { expect, it } from 'vitest';
import { determineVersionBumpType } from '../../src/bump.js';
import type { CommitType, ParsedCommit } from '../../src/types.js';

const createMockCommit = (type: string, breaking = false): ParsedCommit => ({
	subject: 'test commit',
	type: type as CommitType,
	scope: '',
	breaking,
	notes: [],
	hash: 'abc123',
});

it('returns major when any commit has breaking change flag set to true', () => {
	// Prepare
	const commits: ParsedCommit[] = [
		createMockCommit('feat'),
		createMockCommit('fix', true), // Breaking change
		createMockCommit('docs'),
	];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('major');
});

it('does not consider breaking notes for determining bump type', () => {
	// Prepare
	// The current implementation doesn't check notes - it only checks the breaking flag
	const commits: ParsedCommit[] = [
		createMockCommit('chore'),
		{
			...createMockCommit('fix'),
			notes: [{ title: 'BREAKING CHANGE', text: 'This is a breaking change' }],
			breaking: false, // Important: the breaking flag is what matters, not the notes
		},
	];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('patch');
});

it('returns minor when commits include minor change types but no breaking changes', () => {
	// Prepare
	const commits: ParsedCommit[] = [
		createMockCommit('feat'), // Minor change
		createMockCommit('fix'),
		createMockCommit('docs'),
	];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('minor');
});

it('returns minor when commits include feature type', () => {
	// Prepare
	const commits: ParsedCommit[] = [
		createMockCommit('feature'), // Minor change (alternate name)
		createMockCommit('chore'),
	];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('minor');
});

it('returns minor when commits include improvement type', () => {
	// Prepare
	const commits: ParsedCommit[] = [
		createMockCommit('improv'), // Minor change (improvement)
		createMockCommit('chore'),
	];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('minor');
});

it('returns patch when commits only include patch change types', () => {
	// Prepare
	const commits: ParsedCommit[] = [
		createMockCommit('fix'),
		createMockCommit('docs'),
		createMockCommit('style'),
	];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('patch');
});

it('returns patch when commits only include chore and build types', () => {
	// Prepare
	const commits: ParsedCommit[] = [
		createMockCommit('chore'),
		createMockCommit('build'),
		createMockCommit('ci'),
	];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('patch');
});

it('returns patch when no commits are provided', () => {
	// Prepare
	const commits: ParsedCommit[] = [];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('patch');
});

it('prioritizes breaking changes over minor changes', () => {
	// Prepare
	const commits: ParsedCommit[] = [
		createMockCommit('feat'), // Minor change
		createMockCommit('chore', true), // Breaking change but typically patch
	];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('major');
});

it('prioritizes minor changes over patch changes', () => {
	// Prepare
	const commits: ParsedCommit[] = [
		createMockCommit('docs'), // Patch change
		createMockCommit('fix'), // Patch change
		createMockCommit('feat'), // Minor change
		createMockCommit('refactor'), // Patch change
	];

	// Act
	const result = determineVersionBumpType(commits);

	// Assess
	expect(result).toBe('minor');
});
