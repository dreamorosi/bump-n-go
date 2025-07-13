/**
 * Maps conventional commit types to their corresponding semantic version bump type.
 *
 * Used to determine what type of version bump should be applied based on commit types.
 * CI and build commits are excluded as they don't affect end-user functionality.
 */
const ChangeTypeMapping = {
	feat: 'minor',
	feature: 'minor',
	improv: 'minor',
	fix: 'patch',
	docs: 'patch',
	style: 'patch',
	refactor: 'patch',
	perf: 'patch',
	test: 'patch',
	chore: 'patch',
	ci: 'patch',
	build: 'patch',
} as const;

/**
 * Maps conventional commit types to their corresponding changelog section headers.
 *
 * Used when generating changelog sections to group commits under appropriate headings.
 * CI and build commits are excluded as they don't affect end-user functionality.
 */
const ChangeTypeHeaderMapping = {
	feat: 'Features',
	feature: 'Features',
	improv: 'Improvements',
	fix: 'Bug Fixes',
	docs: 'Documentation',
	style: 'Maintenance',
	refactor: 'Improvements',
	perf: 'Improvements',
	test: 'Tests',
	chore: 'Maintenance',
	ci: 'Continuous Integration',
	build: 'Build System',
} as const;

/**
 * Hierarchy values for version bump types to determine precedence.
 *
 * Higher values take precedence when multiple bump types are detected.
 * Used to determine the maximum bump type across all workspaces.
 */
const TypeHierarchy = {
	major: 3,
	minor: 2,
	patch: 1,
} as const;

export { ChangeTypeMapping, ChangeTypeHeaderMapping, TypeHierarchy };
