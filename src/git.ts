import { execSync } from 'node:child_process';
import type { RawCommit } from './types.js';

const getLastTag = (cwd: string): string | null => {
	try {
		return execSync('git describe --tags --abbrev=0', { cwd })
			.toString()
			.trim();
	} catch (error) {
		// No tags found
		return null;
	}
};

const getFirstCommit = (cwd: string): string | null => {
	try {
		return execSync('git rev-list --max-parents=0 HEAD', { cwd })
			.toString()
			.trim();
	} catch (error) {
		return null;
	}
};

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
		return [];
	}
};

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
		return '';
	}
};

const getCommitsSinceTag = (cwd: string, tag: string | null): RawCommit[] => {
	const format = '%H%n%s%n%b%n==END==';
	const range = tag ? `${tag}..HEAD` : '';

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
};

export {
	getLastTag,
	getFirstCommit,
	getChangedFiles,
	getFileDiff,
	getCommitsSinceTag,
};
