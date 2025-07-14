import { describe, expect, it } from 'vitest';
import { preserveVersionRange } from '../../src/version.js';

describe('preserveVersionRange', () => {
	// Parameterized test for different operators
	describe.each([
		{
			operator: '^',
			description: 'caret',
			currentRange: '^1.0.0',
			newVersion: '2.1.0',
			expected: '^2.1.0',
		},
		{
			operator: '~',
			description: 'tilde',
			currentRange: '~1.5.2',
			newVersion: '2.3.1',
			expected: '~2.3.1',
		},
		{
			operator: '>=',
			description: 'greater than or equal',
			currentRange: '>=1.0.0',
			newVersion: '3.0.0',
			expected: '>=3.0.0',
		},
		{
			operator: '>',
			description: 'greater than',
			currentRange: '>1.0.0',
			newVersion: '2.0.0',
			expected: '>2.0.0',
		},
		{
			operator: '<=',
			description: 'less than or equal',
			currentRange: '<=2.0.0',
			newVersion: '3.1.0',
			expected: '<=3.1.0',
		},
		{
			operator: '<',
			description: 'less than',
			currentRange: '<2.0.0',
			newVersion: '1.5.0',
			expected: '<1.5.0',
		},
		{
			operator: '=',
			description: 'exact version',
			currentRange: '=1.0.0',
			newVersion: '2.0.0',
			expected: '=2.0.0',
		},
	])(
		'with $description operator ($operator)',
		({ currentRange, newVersion, expected }) => {
			it(`preserves operator when updating from ${currentRange} to ${newVersion}`, () => {
				expect(preserveVersionRange(currentRange, newVersion)).toBe(expected);
			});
		}
	);

	// Special cases
	it.each([
		{
			scenario: 'no operator',
			currentRange: '1.0.0',
			newVersion: '2.1.0',
			expected: '2.1.0',
		},
		{
			scenario: 'empty range',
			currentRange: '',
			newVersion: '1.0.0',
			expected: '1.0.0',
		},
		{
			scenario: 'prerelease version',
			currentRange: '^2.1.0-alpha',
			newVersion: '3.0.0-beta',
			expected: '^3.0.0-beta',
		},
	])(
		'$scenario: updates $currentRange to $expected with new version $newVersion',
		({ currentRange, newVersion, expected }) => {
			expect(preserveVersionRange(currentRange, newVersion)).toBe(expected);
		}
	);
});
