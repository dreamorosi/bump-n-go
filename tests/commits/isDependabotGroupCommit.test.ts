import { expect, it } from 'vitest';
import { isDependabotGroupCommit } from '../../src/commits.js';

it('returns true for dependabot group commits', () => {
	// Prepare
	const scope = 'deps';

	// Act & Assess
	expect(
		isDependabotGroupCommit('bump the production group with 5 updates', scope)
	).toBe(true);
	expect(
		isDependabotGroupCommit('bump the development group with 3 updates', scope)
	).toBe(true);
	expect(
		isDependabotGroupCommit('bump the security group with 1 update', scope)
	).toBe(true);
	expect(
		isDependabotGroupCommit('bump the npm group with 10 updates', scope)
	).toBe(true);
});

it('returns false for regular dependency commits', () => {
	// Prepare
	const scope = 'deps';

	// Act & Assess
	expect(
		isDependabotGroupCommit('bump typescript from 4.9.0 to 5.0.0', scope)
	).toBe(false);
	expect(
		isDependabotGroupCommit('update lodash to version 4.17.21', scope)
	).toBe(false);
	expect(isDependabotGroupCommit('add new dependency react', scope)).toBe(
		false
	);
	expect(isDependabotGroupCommit('remove unused dependency', scope)).toBe(
		false
	);
});

it('returns false when scope is not deps', () => {
	// Prepare
	const subjects = [
		'bump the production group with 5 updates',
		'bump the development group with 3 updates',
	];

	// Act & Assess
	expect(isDependabotGroupCommit(subjects[0], 'core')).toBe(false);
	expect(isDependabotGroupCommit(subjects[0], 'ui')).toBe(false);
	expect(isDependabotGroupCommit(subjects[0], 'api')).toBe(false);
	expect(isDependabotGroupCommit(subjects[1], '')).toBe(false);
});

it('handles edge cases in subject matching', () => {
	// Prepare
	const scope = 'deps';

	// Act & Assess
	expect(isDependabotGroupCommit('bump the group', scope)).toBe(false);
	expect(isDependabotGroupCommit('bump group with updates', scope)).toBe(false);
	expect(isDependabotGroupCommit('bump the production group', scope)).toBe(
		true
	); // This matches the regex
	expect(isDependabotGroupCommit('group with updates', scope)).toBe(false);
});

it('is case sensitive for group pattern', () => {
	// Prepare
	const scope = 'deps';

	// Act & Assess
	expect(
		isDependabotGroupCommit('bump the Production Group with 5 updates', scope)
	).toBe(false);
	expect(
		isDependabotGroupCommit('Bump the production group with 5 updates', scope)
	).toBe(false);
	expect(
		isDependabotGroupCommit('BUMP THE PRODUCTION GROUP WITH 5 UPDATES', scope)
	).toBe(false);
});

it('handles various group names', () => {
	// Prepare
	const scope = 'deps';

	// Act & Assess
	expect(
		isDependabotGroupCommit(
			'bump the test-dependencies group with 2 updates',
			scope
		)
	).toBe(true);
	expect(
		isDependabotGroupCommit('bump the build-tools group with 1 update', scope)
	).toBe(true);
	expect(
		isDependabotGroupCommit('bump the peer-deps group with 4 updates', scope)
	).toBe(true);
});

it('handles different update counts', () => {
	// Prepare
	const scope = 'deps';

	// Act & Assess
	expect(
		isDependabotGroupCommit('bump the production group with 1 update', scope)
	).toBe(true);
	expect(
		isDependabotGroupCommit('bump the production group with 100 updates', scope)
	).toBe(true);
	expect(
		isDependabotGroupCommit('bump the production group with 0 updates', scope)
	).toBe(true);
});
