import { expect } from 'vitest';
import type { FilesystemMocks } from './mocks.js';

/**
 * Asserts that a specific changelog file has been updated
 * with the expected content
 */
export function expectChangelogUpdated(
	fsMocks: Pick<FilesystemMocks, 'writeFileSync'>,
	changelogPath: string,
	expectedPatterns: string[] = []
): void {
	// Find the write call for this changelog
	const writeCall = fsMocks.writeFileSync.mock.calls.find(
		(call) => call[0] === changelogPath
	);

	// Verify the write call exists
	expect(writeCall).toBeDefined();

	if (writeCall) {
		const content = writeCall[1] as string;

		// Check that each expected pattern is in the content
		for (const pattern of expectedPatterns) {
			expect(content).toContain(pattern);
		}
	} else {
		throw new Error(`No writeFileSync call found for path: ${changelogPath}`);
	}
}
