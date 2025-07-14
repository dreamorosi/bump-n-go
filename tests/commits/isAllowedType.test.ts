import { describe, expect, it } from 'vitest';
import { isAllowedType } from '../../src/commits.js';

describe('isAllowedType', () => {
	// Valid commit types
	it.each([
		'feat',
		'feature',
		'improv',
		'fix',
		'docs',
		'style',
		'refactor',
		'perf',
		'test',
		'chore',
		'ci',
		'build',
	])('accepts valid commit type: %s', (type) => {
		expect(isAllowedType(type)).toBe(true);
	});

	// Invalid types by category
	describe('rejects invalid types', () => {
		it.each(['invalid', 'unknown', 'typo', 'wip', 'revert'])(
			'disallowed type: %s',
			(type) => {
				expect(isAllowedType(type)).toBe(false);
			}
		);

		it.each(['', ' ', '\t', '\n'])('empty or whitespace: %j', (type) => {
			expect(isAllowedType(type)).toBe(false);
		});

		it.each(['123', 'feat!', 'fix-bug', 'feat/scope'])(
			'special characters: %s',
			(type) => {
				expect(isAllowedType(type)).toBe(false);
			}
		);

		it.each(['FEAT', 'Fix', 'Docs'])('uppercase: %s', (type) => {
			expect(isAllowedType(type)).toBe(false);
		});
	});
});
