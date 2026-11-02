import { expect, it } from 'vitest';
import { isProtocolSpecifier } from '../../src/version.js';

it.each([
	'workspace:*',
	'workspace:^1.0.0',
	'catalog:',
	'catalog:react',
	'file:../package-b',
	'link:../package-b',
	'portal:../package-b',
	'npm:package-b@^1.0.0',
	'git+https://github.com/owner/repo.git',
	'github:owner/repo',
])('treats %s as a protocol specifier', (specifier) => {
	// Act & Assess
	expect(isProtocolSpecifier(specifier)).toBe(true);
});

it.each(['1.0.0', '^1.0.0', '~1.2.3', '>=1.0.0 <2.0.0', '*', 'latest', '1.x'])(
	'treats %s as a version range',
	(range) => {
		// Act & Assess
		expect(isProtocolSpecifier(range)).toBe(false);
	}
);
