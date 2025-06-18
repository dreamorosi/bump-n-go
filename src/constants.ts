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

const TypeHierarchy = {
	major: 3,
	minor: 2,
	patch: 1,
} as const;

export { ChangeTypeMapping, ChangeTypeHeaderMapping, TypeHierarchy };
