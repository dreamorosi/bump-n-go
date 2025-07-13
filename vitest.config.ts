import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			thresholds: {
				statements: 100,
				branches: 100,
				functions: 100,
				lines: 100,
			},
			include: ['src/**'],
			exclude: [
				...coverageConfigDefaults.exclude,
				'src/types.ts',
				'src/cli.ts',
			],
		},
		setupFiles: ['./tests/setupEnv.ts'],
	},
});
