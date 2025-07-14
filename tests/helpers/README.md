# Test Helpers

This directory contains helper functions to simplify test setup, data creation, mocking, and assertions.

## Available Helpers

### Factory Functions

Factory functions make it easy to create test data objects with sensible defaults:

```typescript
import { createRawCommit } from '../helpers';

// Create a commit
const commit = createRawCommit({
  hash: 'abc123',
  subject: 'feat: my feature'
});
```

### Mock Types

**IMPORTANT**: Due to Vitest's hoisting behavior, mock declarations must be at the top level of the file.

```typescript
import { vi } from 'vitest';
import { type FilesystemMocks } from '../helpers';

// CORRECT: Define mocks at the top level using vi.hoisted
const fsMocks = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  statSync: vi.fn(),
})) as FilesystemMocks;

// Define the mock implementation at the top level
vi.mock('node:fs', () => ({
  readFileSync: fsMocks.readFileSync,
  writeFileSync: fsMocks.writeFileSync,
  existsSync: fsMocks.existsSync,
  statSync: fsMocks.statSync,
}));

describe('my test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up common patterns in beforeEach
    fsMocks.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);
  });
});
```

### Assertion Helpers

Make assertions more readable and focused:

```typescript
import { expectChangelogUpdated } from '../helpers';

it('updates changelog correctly', () => {
  // Your test code...
  
  expectChangelogUpdated(fsMocks, '/path/to/changelog.md', [
    'expected pattern 1',
    'expected pattern 2'
  ]);
});
```

### Managing Time in Tests

For date-dependent functions, use Vitest's built-in timer functions:

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-03-15'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

## Best Practices

1. **Always define mocks at the top level using `vi.hoisted`**
2. Group related tests with describe blocks
3. Keep tests focused on a single behavior or edge case
4. Use descriptive test names that explain the behavior being tested
5. Keep setup code within the test that needs it to maintain readability

## Example Test Structure

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { myFunction } from '../../src/myModule.js';
import { 
  createRawCommit,
  expectChangelogUpdated,
  type FilesystemMocks 
} from '../helpers';

// Define mocks at the top level
const fsMocks = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn(),
})) as FilesystemMocks;

vi.mock('node:fs', () => ({
  readFileSync: fsMocks.readFileSync,
  writeFileSync: fsMocks.writeFileSync,
  statSync: fsMocks.statSync,
}));

describe('myFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('feature A', () => {
    it('does something', () => {
      // Test code here
    });
  });

  describe('feature B', () => {
    it('handles edge case', () => {
      // Test code here
    });
  });
});
```
