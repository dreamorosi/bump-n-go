import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { it, expect } from 'vitest';

it('should have Node.js engine requirement set to >=23.0.0', () => {
	// Prepare
	const packageJsonPath = join(process.cwd(), 'package.json');
	const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
	const packageJson = JSON.parse(packageJsonContent);

	// Act & Assess
	expect(packageJson.engines).toBeDefined();
	expect(packageJson.engines.node).toBe('>=23.0.0');
});