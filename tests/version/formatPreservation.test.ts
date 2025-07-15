import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { updateWorkspacePackageJson } from '../../src/version.js';
import type { Workspace } from '../../src/types.js';

describe('updateWorkspacePackageJson formatting preservation', () => {
	let testDir: string;
	let workspace: Workspace;

	beforeEach(() => {
		// Create a temporary directory for testing
		testDir = join(tmpdir(), `bump-n-go-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
		
		workspace = {
			name: 'test-package',
			shortName: 'test-package',
			path: testDir,
			version: '1.0.0',
			changed: true,
			commits: [],
			dependencyNames: [],
			isPrivate: false,
		};
	});

	afterEach(() => {
		// Clean up test directory
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
	});

	it('preserves tab indentation with trailing newline', () => {
		// Create package.json with tab indentation
		const originalContent = `{
\t"name": "test-package",
\t"version": "1.0.0",
\t"dependencies": {
\t\t"lodash": "^4.0.0"
\t}
}
`;
		const packageJsonPath = join(testDir, 'package.json');
		writeFileSync(packageJsonPath, originalContent, 'utf-8');

		// Update the package
		updateWorkspacePackageJson(workspace, '2.0.0', { 'test-package': workspace });

		// Read the result
		const result = readFileSync(packageJsonPath, 'utf-8');
		
		// Should preserve tab indentation and trailing newline
		expect(result).toMatch(/^\{$/m);
		expect(result).toMatch(/^\t"name": "test-package",$/m);
		expect(result).toMatch(/^\t"version": "2.0.0",$/m);
		expect(result).toMatch(/^\t"dependencies": \{$/m);
		expect(result).toMatch(/^\t\t"lodash": "\^4.0.0"$/m);
		expect(result).toMatch(/^\t\}$/m);
		expect(result).toMatch(/^\}$/m);
		expect(result.endsWith('\n')).toBe(true);
	});

	it('preserves 2-space indentation with trailing newline', () => {
		// Create package.json with 2-space indentation
		const originalContent = `{
  "name": "test-package",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.0.0"
  }
}
`;
		const packageJsonPath = join(testDir, 'package.json');
		writeFileSync(packageJsonPath, originalContent, 'utf-8');

		// Update the package
		updateWorkspacePackageJson(workspace, '2.0.0', { 'test-package': workspace });

		// Read the result
		const result = readFileSync(packageJsonPath, 'utf-8');
		
		// Should preserve 2-space indentation and trailing newline
		expect(result).toMatch(/^\{$/m);
		expect(result).toMatch(/^  "name": "test-package",$/m);
		expect(result).toMatch(/^  "version": "2.0.0",$/m);
		expect(result).toMatch(/^  "dependencies": \{$/m);
		expect(result).toMatch(/^    "lodash": "\^4.0.0"$/m);
		expect(result).toMatch(/^  \}$/m);
		expect(result).toMatch(/^\}$/m);
		expect(result.endsWith('\n')).toBe(true);
	});

	it('preserves 4-space indentation without trailing newline', () => {
		// Create package.json with 4-space indentation and no trailing newline
		const originalContent = `{
    "name": "test-package",
    "version": "1.0.0",
    "dependencies": {
        "lodash": "^4.0.0"
    }
}`;
		const packageJsonPath = join(testDir, 'package.json');
		writeFileSync(packageJsonPath, originalContent, 'utf-8');

		// Update the package
		updateWorkspacePackageJson(workspace, '2.0.0', { 'test-package': workspace });

		// Read the result
		const result = readFileSync(packageJsonPath, 'utf-8');
		
		// Should preserve 4-space indentation and no trailing newline
		expect(result).toMatch(/^\{$/m);
		expect(result).toMatch(/^    "name": "test-package",$/m);
		expect(result).toMatch(/^    "version": "2.0.0",$/m);
		expect(result).toMatch(/^    "dependencies": \{$/m);
		expect(result).toMatch(/^        "lodash": "\^4.0.0"$/m);
		expect(result).toMatch(/^    \}$/m);
		expect(result).toMatch(/^\}$/m);
		expect(result.endsWith('\n')).toBe(false);
	});

	it('preserves tab indentation without trailing newline', () => {
		// Create package.json with tab indentation and no trailing newline
		const originalContent = `{
\t"name": "test-package",
\t"version": "1.0.0"
}`;
		const packageJsonPath = join(testDir, 'package.json');
		writeFileSync(packageJsonPath, originalContent, 'utf-8');

		// Update the package
		updateWorkspacePackageJson(workspace, '2.0.0', { 'test-package': workspace });

		// Read the result
		const result = readFileSync(packageJsonPath, 'utf-8');
		
		// Should preserve tab indentation and no trailing newline
		expect(result).toMatch(/^\{$/m);
		expect(result).toMatch(/^\t"name": "test-package",$/m);
		expect(result).toMatch(/^\t"version": "2.0.0"$/m);
		expect(result).toMatch(/^\}$/m);
		expect(result.endsWith('\n')).toBe(false);
	});

	it('updates workspace dependencies while preserving formatting', () => {
		// Create two workspaces
		const workspace1 = {
			name: 'package-a',
			shortName: 'package-a',
			path: testDir,
			version: '1.0.0',
			changed: true,
			commits: [],
			dependencyNames: [],
			isPrivate: false,
		};

		const workspace2Dir = join(tmpdir(), `bump-n-go-test-2-${Date.now()}`);
		mkdirSync(workspace2Dir, { recursive: true });
		
		const workspace2 = {
			name: 'package-b',
			shortName: 'package-b',
			path: workspace2Dir,
			version: '1.0.0',
			changed: true,
			commits: [],
			dependencyNames: [],
			isPrivate: false,
		};

		// Create package.json with 2-space indentation that depends on package-b
		const originalContent = `{
  "name": "package-a",
  "version": "1.0.0",
  "dependencies": {
    "package-b": "^1.0.0",
    "lodash": "^4.0.0"
  }
}
`;
		const packageJsonPath = join(testDir, 'package.json');
		writeFileSync(packageJsonPath, originalContent, 'utf-8');

		// Update the package
		updateWorkspacePackageJson(workspace1, '2.0.0', { 'package-a': workspace1, 'package-b': workspace2 });

		// Read the result
		const result = readFileSync(packageJsonPath, 'utf-8');
		
		// Should preserve 2-space indentation, update version and workspace dependency
		expect(result).toMatch(/^  "name": "package-a",$/m);
		expect(result).toMatch(/^  "version": "2.0.0",$/m);
		expect(result).toMatch(/^  "dependencies": \{$/m);
		expect(result).toMatch(/^    "package-b": "\^2.0.0",$/m);
		expect(result).toMatch(/^    "lodash": "\^4.0.0"$/m);
		expect(result.endsWith('\n')).toBe(true);

		// Clean up
		rmSync(workspace2Dir, { recursive: true });
	});
});