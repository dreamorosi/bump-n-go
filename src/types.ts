import type { ChangeTypeMapping } from './constants.js';

type RawCommit = {
	hash: string | undefined;
	subject: string | undefined;
	body: string;
};

type CommitType = keyof typeof ChangeTypeMapping;

type ParsedCommit = {
	subject: string;
	type: CommitType;
	scope: string;
	breaking: boolean;
	notes: { title: string; text: string }[];
	hash?: string;
};

type Workspace = {
	name: string;
	shortName: string;
	path: string;
	version: string;
	changed: boolean;
	commits: ParsedCommit[];
	dependencyNames: string[];
	isPrivate: boolean;
};

type BumpType = 'major' | 'minor' | 'patch';

// Changelog-related types
type SectionsByType = Map<string, string[]>;
type SectionsByWorkspace = Map<string, Map<string, string[]>>;

type ChangelogSections = {
	mainSections: string;
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
