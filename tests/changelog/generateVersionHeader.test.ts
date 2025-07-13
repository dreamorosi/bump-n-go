import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { generateVersionHeader } from '../../src/changelog.js';

beforeEach(() => {
	// Mock Date to ensure consistent test results
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2024-03-15'));
});

afterEach(() => {
	vi.useRealTimers();
});

it('generates version header with current date', () => {
	// Prepare
	const version = '2.1.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v2.1.0';

	// Act
	const result = generateVersionHeader(version, versionLink);

	// Assess
	expect(result).toBe(
		'## [2.1.0](https://github.com/user/repo/releases/tag/v2.1.0) (2024-03-15)\n\n'
	);
});

it('handles single digit day and month', () => {
	// Prepare
	vi.setSystemTime(new Date('2024-01-05'));
	const version = '1.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';

	// Act
	const result = generateVersionHeader(version, versionLink);

	// Assess
	expect(result).toBe(
		'## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-01-05)\n\n'
	);
});

it('handles double digit day and month', () => {
	// Prepare
	vi.setSystemTime(new Date('2024-12-25'));
	const version = '3.2.1';
	const versionLink = 'https://github.com/user/repo/releases/tag/v3.2.1';

	// Act
	const result = generateVersionHeader(version, versionLink);

	// Assess
	expect(result).toBe(
		'## [3.2.1](https://github.com/user/repo/releases/tag/v3.2.1) (2024-12-25)\n\n'
	);
});

it('handles prerelease versions', () => {
	// Prepare
	const version = '2.0.0-alpha.1';
	const versionLink =
		'https://github.com/user/repo/releases/tag/v2.0.0-alpha.1';

	// Act
	const result = generateVersionHeader(version, versionLink);

	// Assess
	expect(result).toBe(
		'## [2.0.0-alpha.1](https://github.com/user/repo/releases/tag/v2.0.0-alpha.1) (2024-03-15)\n\n'
	);
});

it('handles different version link formats', () => {
	// Prepare
	const version = '1.5.2';
	const versionLink = 'https://gitlab.com/user/repo/-/releases/1.5.2';

	// Act
	const result = generateVersionHeader(version, versionLink);

	// Assess
	expect(result).toBe(
		'## [1.5.2](https://gitlab.com/user/repo/-/releases/1.5.2) (2024-03-15)\n\n'
	);
});

it('handles empty version link', () => {
	// Prepare
	const version = '1.0.0';
	const versionLink = '';

	// Act
	const result = generateVersionHeader(version, versionLink);

	// Assess
	expect(result).toBe('## [1.0.0]() (2024-03-15)\n\n');
});

it('handles year boundary correctly', () => {
	// Prepare
	vi.setSystemTime(new Date('2025-01-01'));
	const version = '4.0.0';
	const versionLink = 'https://github.com/user/repo/releases/tag/v4.0.0';

	// Act
	const result = generateVersionHeader(version, versionLink);

	// Assess
	expect(result).toBe(
		'## [4.0.0](https://github.com/user/repo/releases/tag/v4.0.0) (2025-01-01)\n\n'
	);
});
