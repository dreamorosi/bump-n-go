import { it, expect } from 'vitest';
import { hasProductionDependencyChanges } from '../../src/commits.js';

it('detects changes in dependencies section', () => {
	// Prepare
	const diff = `@@ -10,6 +10,7 @@
   "dependencies": {
     "react": "^18.0.0",
+    "lodash": "^4.17.21",
     "typescript": "^5.0.0"
   },
   "devDependencies": {`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(true);
});

it('ignores changes in devDependencies section', () => {
	// Prepare
	const diff = `@@ -15,6 +15,7 @@
   "devDependencies": {
     "@types/node": "^18.0.0",
+    "jest": "^29.0.0",
     "typescript": "^5.0.0"
   },
   "peerDependencies": {`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(false);
});

it('detects dependency removals', () => {
	// Prepare
	const diff = `@@ -10,7 +10,6 @@
   "dependencies": {
     "react": "^18.0.0",
-    "lodash": "^4.17.21",
     "typescript": "^5.0.0"
   },
   "devDependencies": {`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(true);
});

it('detects dependency version updates', () => {
	// Prepare
	const diff = `@@ -10,7 +10,7 @@
   "dependencies": {
     "react": "^18.0.0",
-    "lodash": "^4.17.20",
+    "lodash": "^4.17.21",
     "typescript": "^5.0.0"
   },
   "devDependencies": {`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(true);
});

it('ignores changes to dependencies section header itself', () => {
	// Prepare
	const diff = `@@ -9,6 +9,7 @@
   "scripts": {
     "build": "tsc"
   },
+  "dependencies": {
-  "dependencies": {
     "react": "^18.0.0"
   },`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(false);
});

it('handles multiple sections correctly', () => {
	// Prepare
	const diff = `@@ -10,10 +10,10 @@
   "dependencies": {
     "react": "^18.0.0"
   },
   "devDependencies": {
+    "jest": "^29.0.0",
     "@types/node": "^18.0.0"
   },
   "peerDependencies": {
     "react": ">=16.0.0"
   }`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(false);
});

it('detects changes when dependencies and devDependencies both have changes', () => {
	// Prepare
	const diff = `@@ -10,10 +10,12 @@
   "dependencies": {
+    "axios": "^1.0.0",
     "react": "^18.0.0"
   },
   "devDependencies": {
+    "jest": "^29.0.0",
     "@types/node": "^18.0.0"
   }`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(true);
});

it('handles peerDependencies and optionalDependencies sections', () => {
	// Prepare
	const diff = `@@ -15,10 +15,12 @@
   "peerDependencies": {
+    "react": ">=16.0.0",
     "react-dom": ">=16.0.0"
   },
   "optionalDependencies": {
+    "fsevents": "^2.0.0",
     "chokidar": "^3.0.0"
   }`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(false);
});

it('returns false for empty diff', () => {
	// Prepare
	const diff = '';

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(false);
});

it('returns false when no package.json changes', () => {
	// Prepare
	const diff = `@@ -1,6 +1,7 @@
 import React from 'react';
 
+// New comment
 function App() {
   return <div>Hello World</div>;
 }`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(false);
});

it('handles complex nested JSON structure', () => {
	// Prepare
	const diff = `@@ -8,15 +8,16 @@
   "main": "index.js",
   "dependencies": {
     "react": "^18.0.0",
+    "redux": "^4.2.0",
     "react-router": {
       "version": "^6.0.0",
       "nested": {
         "deep": "value"
       }
     }
   },
   "devDependencies": {
     "@types/react": "^18.0.0"
   }`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(true);
});

it('correctly transitions between sections', () => {
	// Prepare
	const diff = `@@ -10,15 +10,16 @@
   "dependencies": {
     "react": "^18.0.0"
   },
   "devDependencies": {
+    "jest": "^29.0.0",
     "@types/node": "^18.0.0"
   },
   "scripts": {
+    "test": "jest",
     "build": "tsc"
   }`;

	// Act
	const result = hasProductionDependencyChanges(diff);

	// Assess
	expect(result).toBe(false);
});