import type { ChangeTypeMapping } from './constants.js';

/**
 * Raw commit data as retrieved from git log.
 */
type RawCommit = {
	/** The commit hash */
	hash: string | undefined;
	/** The commit subject/title */
	subject: string | undefined;
	/** The commit body/description */
	body: string;
};

/**
 * Valid commit types based on conventional commits.
 */
type CommitType = keyof typeof ChangeTypeMapping;

/**
 * Parsed conventional commit with extracted metadata.
 */
type ParsedCommit = {
	/** The commit subject/title */
	subject: string;
	/** The conventional commit type (feat, fix, etc.) */
	type: CommitType;
	/** The scope of the change (optional) */
	scope: string;
	/** Whether this is a breaking change */
	breaking: boolean;
	/** Additional notes from the commit */
	notes: { title: string; text: string }[];
	/** The commit hash (optional) */
	hash?: string;
};

/**
 * Workspace/package information with associated commits.
 */
type Workspace = {
	/** The full package name */
	name: string;
	/** The short name (last part of the package name) */
	shortName: string;
	/** The file system path to the workspace */
	path: string;
	/** The current version of the package */
	version: string;
	/** Whether this workspace has changes */
	changed: boolean;
	/** Array of commits that affect this workspace */
	commits: ParsedCommit[];
	/** Names of dependencies this workspace depends on */
	dependencyNames: string[];
	/** Whether this is a private package */
	isPrivate: boolean;
};

/**
 * Semantic version bump types.
 */
type BumpType = 'major' | 'minor' | 'patch';

/**
 * Changelog sections grouped by commit type.
 */
type SectionsByType = Map<string, string[]>;

/**
 * Changelog sections grouped by workspace and then by commit type.
 */
type SectionsByWorkspace = Map<string, Map<string, string[]>>;

/**
 * Generated changelog content for main and workspace-specific changelogs.
 */
type ChangelogSections = {
	/** Main changelog sections for the root CHANGELOG.md */
	mainSections: string;
	/** Workspace-specific changelog sections */
	workspaceSections: SectionsByWorkspace;
};

export type {
	RawCommit,
	ParsedCommit,
	Workspace,
	CommitType,
	BumpType,
	SectionsByType,
	SectionsByWorkspace,
	ChangelogSections,
};
