import type { RawCommit } from '../../src/types.js';

/**
 * Factory function to create a RawCommit object for testing.
 * Used in Git-related tests.
 */
export function createRawCommit(overrides: Partial<RawCommit> = {}): RawCommit {
	return {
		hash: 'abc123',
		subject: 'feat: test feature',
		body: 'Test commit body',
		...overrides,
	};
}
