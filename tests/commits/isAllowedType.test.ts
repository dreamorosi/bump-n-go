import { expect, it } from 'vitest';
import { isAllowedType } from '../../src/commits.js';

it('returns true for allowed commit types', () => {
	// Prepare & Act & Assess
	expect(isAllowedType('feat')).toBe(true);
	expect(isAllowedType('feature')).toBe(true);
	expect(isAllowedType('improv')).toBe(true);
	expect(isAllowedType('fix')).toBe(true);
	expect(isAllowedType('docs')).toBe(true);
	expect(isAllowedType('style')).toBe(true);
	expect(isAllowedType('refactor')).toBe(true);
	expect(isAllowedType('perf')).toBe(true);
	expect(isAllowedType('test')).toBe(true);
	expect(isAllowedType('chore')).toBe(true);
	expect(isAllowedType('ci')).toBe(true);
	expect(isAllowedType('build')).toBe(true);
});

it('returns false for disallowed commit types', () => {
	// Prepare & Act & Assess
	expect(isAllowedType('invalid')).toBe(false);
	expect(isAllowedType('unknown')).toBe(false);
	expect(isAllowedType('typo')).toBe(false);
	expect(isAllowedType('wip')).toBe(false);
	expect(isAllowedType('revert')).toBe(false);
});

it('returns false for empty or whitespace strings', () => {
	// Prepare & Act & Assess
	expect(isAllowedType('')).toBe(false);
	expect(isAllowedType(' ')).toBe(false);
	expect(isAllowedType('\t')).toBe(false);
	expect(isAllowedType('\n')).toBe(false);
});

it('returns false for special characters and numbers', () => {
	// Prepare & Act & Assess
	expect(isAllowedType('123')).toBe(false);
	expect(isAllowedType('feat!')).toBe(false);
	expect(isAllowedType('fix-bug')).toBe(false);
	expect(isAllowedType('feat/scope')).toBe(false);
});

it('is case sensitive', () => {
	// Prepare & Act & Assess
	expect(isAllowedType('FEAT')).toBe(false);
	expect(isAllowedType('Fix')).toBe(false);
	expect(isAllowedType('Docs')).toBe(false);
});
