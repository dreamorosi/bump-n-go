import { expect, it } from 'vitest';
import { withVersionAfterName } from '../../src/version.js';

it('places version right after name', () => {
	// Act
	const result = withVersionAfterName({
		name: 'a',
		private: true,
		type: 'module',
	});

	// Assess
	expect(Object.keys(result)).toEqual(['name', 'version', 'private', 'type']);
});

it('places version first when there is no name', () => {
	// Act
	const result = withVersionAfterName({ private: true });

	// Assess
	expect(Object.keys(result)).toEqual(['version', 'private']);
});
