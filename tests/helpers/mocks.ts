import type { vi } from 'vitest';

/**
 * Types for common mocked modules
 *
 * These type definitions provide type safety when working with mocks.
 *
 * IMPORTANT: In Vitest, mocks must be defined at the top level using vi.hoisted
 * Example:
 *
 * ```typescript
 * const fsMocks = vi.hoisted(() => ({
 *   readFileSync: vi.fn(),
 *   writeFileSync: vi.fn(),
 *   existsSync: vi.fn(),
 *   statSync: vi.fn()
 * })) as FilesystemMocks;
 *
 * vi.mock('node:fs', () => ({
 *   readFileSync: fsMocks.readFileSync,
 *   writeFileSync: fsMocks.writeFileSync,
 *   existsSync: fsMocks.existsSync,
 *   statSync: fsMocks.statSync
 * }));
 * ```
 */
export type FilesystemMocks = {
	readFileSync: ReturnType<typeof vi.fn>;
	writeFileSync: ReturnType<typeof vi.fn>;
	existsSync: ReturnType<typeof vi.fn>;
	statSync: ReturnType<typeof vi.fn>;
};
