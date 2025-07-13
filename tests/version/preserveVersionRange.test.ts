import { expect, it } from 'vitest';
import { preserveVersionRange } from '../../src/version.js';

it('preserves caret operator', () => {
	// Prepare
	const currentRange = '^1.0.0';
	const newVersion = '2.1.0';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('^2.1.0');
});

it('preserves tilde operator', () => {
	// Prepare
	const currentRange = '~1.5.2';
	const newVersion = '2.3.1';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('~2.3.1');
});

it('preserves greater than or equal operator', () => {
	// Prepare
	const currentRange = '>=1.0.0';
	const newVersion = '3.0.0';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('>=3.0.0');
});

it('preserves greater than operator', () => {
	// Prepare
	const currentRange = '>1.0.0';
	const newVersion = '2.0.0';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('>2.0.0');
});

it('preserves less than or equal operator', () => {
	// Prepare
	const currentRange = '<=2.0.0';
	const newVersion = '3.1.0';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('<=3.1.0');
});

it('preserves less than operator', () => {
	// Prepare
	const currentRange = '<2.0.0';
	const newVersion = '1.5.0';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('<1.5.0');
});

it('preserves exact version operator', () => {
	// Prepare
	const currentRange = '=1.0.0';
	const newVersion = '2.0.0';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('=2.0.0');
});

it('returns new version when no operator is present', () => {
	// Prepare
	const currentRange = '1.0.0';
	const newVersion = '2.1.0';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('2.1.0');
});

it('returns new version when range is malformed', () => {
	// Prepare
	const currentRange = '';
	const newVersion = '1.0.0';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('1.0.0');
});

it('handles complex version ranges with prerelease', () => {
	// Prepare
	const currentRange = '^2.1.0-alpha';
	const newVersion = '3.0.0-beta';

	// Act
	const result = preserveVersionRange(currentRange, newVersion);

	// Assess
	expect(result).toBe('^3.0.0-beta');
});
