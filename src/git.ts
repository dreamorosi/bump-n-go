import { execSync } from 'node:child_process';
import { logger } from './logger.js';
import type { RawCommit } from './types.js';

/**
 * Gets the last git tag in the repository.
 *
 * @param cwd - the working directory to execute git commands in
 * @returns the last tag or null if no tags exist
 */
const getLastTag = (cwd: string): string | null => {
	try {
		return execSync('git describe --tags --abbrev=0', { cwd })
			.toString()
			.trim();
	} catch (error) {
		logger.error(
			`No git tags found in ${cwd}: ${error instanceof Error ? error.message : String(error)}`
		);
		return null;
	}
};

/**
 * Gets the first commit hash in the repository.
 *
 * @param cwd - the working directory to execute git commands in
 * @returns the first commit hash or null if unable to retrieve
 */
const getFirstCommit = (cwd: string): string | null => {
	try {
		return execSync('git rev-list --max-parents=0 HEAD', { cwd })
			.toString()
			.trim();
	} catch (error) {
		logger.error(
			`Failed to get first commit in ${cwd}: ${error instanceof Error ? error.message : String(error)}`
		);
		return null;
	}
};

/**
 * Gets the list of files changed in a specific commit.
 *
 * @param cwd - the working directory to execute git commands in
 * @param commitHash - the commit hash to analyze
 * @returns array of changed file paths, empty array if unable to retrieve
 */
const getChangedFiles = (cwd: string, commitHash: string): string[] => {
	try {
		const output = execSync(
			`git show --name-only --pretty=format: ${commitHash}`,
			{ cwd }
		)
			.toString()
			.trim();

		// Filter out empty lines and return file paths
		return output.split('\n').filter((line) => line.trim() !== '');
	} catch (error) {
		logger.error(
			`Failed to get changed files for commit ${commitHash} in ${cwd}: ${error instanceof Error ? error.message : String(error)}`
		);
		return [];
	}
};

/**
 * Gets the diff for a specific file in a commit.
 *
 * @param cwd - the working directory to execute git commands in
 * @param commitHash - the commit hash to analyze
 * @param filePath - the path to the file to get diff for
 * @returns the file diff as a string, empty string if unable to retrieve
 */
const getFileDiff = (
	cwd: string,
	commitHash: string,
	filePath: string
): string => {
	try {
		const output = execSync(`git show ${commitHash} -- "${filePath}"`, {
			cwd,
		}).toString();

		return output;
	} catch (error) {
		logger.error(
			`Failed to get file diff for ${filePath} in commit ${commitHash} at ${cwd}: ${error instanceof Error ? error.message : String(error)}`
		);
		return '';
	}
};

/**
 * Gets all commits since a specific tag or from the beginning if no tag provided.
 *
 * @param cwd - the working directory to execute git commands in
 * @param tag - the tag to start from, or null to get all commits
 * @returns array of raw commit objects
 */
const getCommitsSinceTag = (cwd: string, tag: string | null): RawCommit[] => {
	const format = '%H%n%s%n%b%n==END==';
	const range = tag ? `${tag}..HEAD` : '';

	try {
		const output = execSync(`git log ${range} --pretty=format:"${format}"`, {
			cwd,
		}).toString();

		const commits = [];
		const commitChunks = output.split('==END==\n');

		for (const chunk of commitChunks) {
			if (!chunk.trim()) continue;

			const lines = chunk.split('\n');
			const hash = lines[0];
			const subject = lines[1];
			const body = lines.slice(2).join('\n').trim();

			commits.push({ hash, subject, body });
		}

		return commits;
	} catch (error) {
		const rangeDesc = tag ? `since tag ${tag}` : 'from beginning';
		logger.error(
			`Failed to get commits ${rangeDesc} in ${cwd}: ${error instanceof Error ? error.message : String(error)}`
		);
		return [];
	}
};

export {
	getLastTag,
	getFirstCommit,
	getChangedFiles,
	getFileDiff,
	getCommitsSinceTag,
};
