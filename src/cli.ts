#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import meow from 'meow';
import { processMonorepo } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

/**
 * CLI interface for bump-n-go using meow.
 *
 * Provides command-line argument parsing and help text generation for the
 * repository changelog and versioning tool. Supports both monorepos and
 * single-package repositories.
 */
const cli = meow(
	`
	Usage
	  $ bump-n-go [options]

	Options
	  --dry-run, -d     Preview changes without writing files
	  --type, -t        Force a specific version bump type (major, minor, patch)
	  --verbose, -v     Enable verbose logging
	  --help, -h        Show help
	  --version         Show version

	Examples
	  $ bump-n-go
	  $ bump-n-go --dry-run
	  $ bump-n-go --type minor
	  $ bump-n-go --verbose --dry-run
`,
	{
		importMeta: import.meta,
		description: packageJson.description,
		flags: {
			dryRun: {
				type: 'boolean',
				shortFlag: 'd',
				default: false,
			},
			type: {
				type: 'string',
				shortFlag: 't',
			},
			verbose: {
				type: 'boolean',
				shortFlag: 'v',
				default: false,
			},
		},
	}
);

/**
 * Main CLI execution function.
 *
 * Processes command-line arguments and executes the monorepo processing
 * with the provided options. Uses the current working directory as the
 * root directory for the monorepo.
 */
const main = async (): Promise<void> => {
	try {
		await processMonorepo({
			root: process.cwd(),
			dryRun: cli.flags.dryRun,
			type: cli.flags.type,
			verbose: cli.flags.verbose,
		});
	} catch (error) {
		console.error('Error:', error instanceof Error ? error.message : error);
		process.exit(1);
	}
};

// Run the CLI
const scriptPath = process.argv[1] || '';
if (
	import.meta.url.endsWith(scriptPath) ||
	import.meta.url === `file://${scriptPath}` ||
	scriptPath.endsWith('bump-n-go')
) {
	main().catch((error) => {
		console.error('Unhandled error:', error);
		process.exit(1);
	});
}

export { cli, main };
