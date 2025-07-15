import { describe, expect, it } from 'vitest';
import { detectFormatting } from '../../src/version.js';

describe('detectFormatting', () => {
	it('detects tab indentation with trailing newline', () => {
		const content = `{
\t"name": "test-package",
\t"version": "1.0.0"
}
`;
		const result = detectFormatting(content);
		expect(result.indent).toBe('\t');
		expect(result.hasTrailingNewline).toBe(true);
	});

	it('detects 2-space indentation with trailing newline', () => {
		const content = `{
  "name": "test-package",
  "version": "1.0.0"
}
`;
		const result = detectFormatting(content);
		expect(result.indent).toBe('  ');
		expect(result.hasTrailingNewline).toBe(true);
	});

	it('detects 4-space indentation with trailing newline', () => {
		const content = `{
    "name": "test-package",
    "version": "1.0.0"
}
`;
		const result = detectFormatting(content);
		expect(result.indent).toBe('    ');
		expect(result.hasTrailingNewline).toBe(true);
	});

	it('detects tab indentation without trailing newline', () => {
		const content = `{
\t"name": "test-package",
\t"version": "1.0.0"
}`;
		const result = detectFormatting(content);
		expect(result.indent).toBe('\t');
		expect(result.hasTrailingNewline).toBe(false);
	});

	it('detects 2-space indentation without trailing newline', () => {
		const content = `{
  "name": "test-package",
  "version": "1.0.0"
}`;
		const result = detectFormatting(content);
		expect(result.indent).toBe('  ');
		expect(result.hasTrailingNewline).toBe(false);
	});

	it('defaults to tab indentation with trailing newline for unformatted JSON', () => {
		const content = '{"name":"test-package","version":"1.0.0"}';
		const result = detectFormatting(content);
		expect(result.indent).toBe('\t');
		expect(result.hasTrailingNewline).toBe(true);
	});

	it('defaults to tab indentation with trailing newline for empty content', () => {
		const content = '';
		const result = detectFormatting(content);
		expect(result.indent).toBe('\t');
		expect(result.hasTrailingNewline).toBe(true);
	});

	it('handles mixed indentation by using the first found', () => {
		const content = `{
\t"name": "test-package",
  "version": "1.0.0"
}
`;
		const result = detectFormatting(content);
		expect(result.indent).toBe('\t');
		expect(result.hasTrailingNewline).toBe(true);
	});

	it('handles content with only braces and no indentation', () => {
		const content = `{
}
`;
		const result = detectFormatting(content);
		expect(result.indent).toBe('\t');
		expect(result.hasTrailingNewline).toBe(true);
	});

	it('detects indentation from nested objects', () => {
		const content = `{
  "dependencies": {
    "lodash": "^4.0.0"
  }
}
`;
		const result = detectFormatting(content);
		expect(result.indent).toBe('  ');
		expect(result.hasTrailingNewline).toBe(true);
	});
});