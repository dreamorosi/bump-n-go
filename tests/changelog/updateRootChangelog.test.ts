import type fs from 'node:fs';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { updateRootChangelog } from '../../src/changelog.js';
import { expectChangelogUpdated } from '../helpers/index.js';
import type { FilesystemMocks } from '../helpers/mocks.js';

// Mocks need to be hoisted to the top level
const fsMocks = vi.hoisted(() => ({
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	statSync: vi.fn(),
	existsSync: vi.fn(), // Added missing property
})) as FilesystemMocks;

// Mock must be at the top level
vi.mock('node:fs', () => ({
	readFileSync: fsMocks.readFileSync,
	writeFileSync: fsMocks.writeFileSync,
	statSync: fsMocks.statSync,
	existsSync: fsMocks.existsSync, // Added to mock implementation
}));

describe('updateRootChangelog', () => {
	const changelogPath = '/test/CHANGELOG.md';

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-03-15'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('file creation', () => {
		it('creates new changelog when file does not exist', () => {
			// Prepare
			const version = '1.0.0';
			const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
			const sections = '### Features\n\n- **package-a** Add new feature\n';

			fsMocks.statSync.mockImplementation(() => {
				throw new Error('File not found');
			});

			// Act
			updateRootChangelog(changelogPath, version, versionLink, sections);

			// Assess
			const expectedPatterns = [
				'# Changelog',
				'## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)',
				'### Features',
				'- **package-a** Add new feature',
			];
			expectChangelogUpdated(fsMocks, changelogPath, expectedPatterns);
		});
	});

	describe('file updating', () => {
		it('prepends new version to existing changelog', () => {
			// Prepare
			const version = '2.0.0';
			const versionLink = 'https://github.com/user/repo/releases/tag/v2.0.0';
			const sections = '### Features\n\n- **package-b** Add breaking change\n';
			const existingContent =
				'# Changelog\n\n## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-01-01)\n\n### Features\n\n- Initial release\n';

			fsMocks.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);
			fsMocks.readFileSync.mockReturnValue(existingContent);

			// Act
			updateRootChangelog(changelogPath, version, versionLink, sections);

			// Assess
			const expectedPatterns = [
				'# Changelog',
				'## [2.0.0](https://github.com/user/repo/releases/tag/v2.0.0) (2024-03-15)',
				'### Features',
				'- **package-b** Add breaking change',
				'## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-01-01)',
			];
			expectChangelogUpdated(fsMocks, changelogPath, expectedPatterns);
		});

		it('preserves existing header format', () => {
			// Prepare
			const version = '1.1.0';
			const versionLink = 'https://github.com/user/repo/releases/tag/v1.1.0';
			const sections = '### Features\n\n- **package-c** Add feature\n';
			const existingContent =
				'# Change Log\n\n## Version 1.0.0\n\n- Previous version';

			fsMocks.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);
			fsMocks.readFileSync.mockReturnValue(existingContent);

			// Act
			updateRootChangelog(changelogPath, version, versionLink, sections);

			// Assess
			const expectedPatterns = [
				'# Change Log',
				'## [1.1.0](https://github.com/user/repo/releases/tag/v1.1.0) (2024-03-15)',
				'### Features',
				'- **package-c** Add feature',
				'## Version 1.0.0',
				'- Previous version',
			];
			expectChangelogUpdated(fsMocks, changelogPath, expectedPatterns);
		});
	});

	describe('edge cases', () => {
		it('handles empty sections', () => {
			// Prepare
			const version = '1.0.1';
			const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.1';
			const sections = '';

			fsMocks.statSync.mockImplementation(() => {
				throw new Error('File not found');
			});

			// Act
			updateRootChangelog(changelogPath, version, versionLink, sections);

			// Assess
			const expectedPatterns = [
				'# Changelog',
				'## [1.0.1](https://github.com/user/repo/releases/tag/v1.0.1) (2024-03-15)',
			];
			expectChangelogUpdated(fsMocks, changelogPath, expectedPatterns);
		});

		it('handles file that exists but is not readable', () => {
			// Prepare
			const version = '1.0.0';
			const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
			const sections = '### Features\n\n- **package-a** Add feature\n';

			fsMocks.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);
			fsMocks.readFileSync.mockImplementation(() => {
				throw new Error('Permission denied');
			});

			// Act
			updateRootChangelog(changelogPath, version, versionLink, sections);

			// Assess
			const expectedPatterns = [
				'# Changelog',
				'## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)',
				'### Features',
				'- **package-a** Add feature',
			];
			expectChangelogUpdated(fsMocks, changelogPath, expectedPatterns);
		});

		it('handles changelog without existing header', () => {
			// Prepare
			const version = '1.0.0';
			const versionLink = 'https://github.com/user/repo/releases/tag/v1.0.0';
			const sections = '### Features\n\n- **package-a** Add feature\n';
			const existingContent =
				'## Version 0.9.0\n\n- Previous content without main header';

			fsMocks.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);
			fsMocks.readFileSync.mockReturnValue(existingContent);

			// Act
			updateRootChangelog(changelogPath, version, versionLink, sections);

			// Assess
			const expectedPatterns = [
				'# Changelog',
				'## [1.0.0](https://github.com/user/repo/releases/tag/v1.0.0) (2024-03-15)',
				'### Features',
				'- **package-a** Add feature',
				'## Version 0.9.0',
				'- Previous content without main header',
			];
			expectChangelogUpdated(fsMocks, changelogPath, expectedPatterns);
		});
	});
});
