# ship-it-cli

An opinionated changelog generator and versioning tool for monorepos. Automatically generates changelogs based on conventional commits, determines semantic version bumps, and updates package versions across all workspaces.

## Features

- 🚀 **Automatic Changelog Generation** - Generate changelogs from conventional commits
- 📦 **Monorepo Support** - Works with npm workspaces
- 🔢 **Semantic Versioning** - Automatically determine version bumps (major/minor/patch)
- 🏷️ **Prerelease Support** - Preserve prerelease identifiers (alpha, beta, rc)
- 🔒 **Private Package Handling** - Exclude private packages from main changelog
- 🔗 **Dependency Updates** - Update intra-project dependencies automatically
- 📝 **Individual Changelogs** - Generate workspace-specific changelog files
- 🔧 **Package Version Bumping** - Update all package.json files consistently

## Installation

```bash
npm install ship-it-cli
```

## Usage

### Basic Usage

```bash
npx ship-it-cli
```

### Options

```bash
# Dry run (preview changes without writing)
npx ship-it-cli --dry-run

# Force a specific version bump type
npx ship-it-cli --type minor

# Enable verbose logging
npx ship-it-cli --verbose
```

## How It Works

1. **Analyzes Git History** - Scans commits since the last git tag
2. **Parses Conventional Commits** - Extracts commit types and scopes
3. **Maps to Workspaces** - Associates commits with affected packages
4. **Filters Relevant Changes** - Excludes dev dependencies and internal tooling changes
5. **Determines Version Bump** - Calculates semantic version increase
6. **Generates Changelogs** - Updates root and workspace-specific CHANGELOG.md files
7. **Bumps Versions** - Updates all package.json files and dependencies

## Conventional Commits

The tool recognizes these conventional commit types:

| Type | Version Bump | Changelog Section |
|------|--------------|-------------------|
| `feat` / `feature` | minor | Features |
| `fix` | patch | Bug Fixes |
| `docs` | patch | Documentation |
| `style` | patch | Styles |
| `refactor` | patch | Code Refactoring |
| `perf` | patch | Performance Improvements |
| `test` | patch | Tests |
| `chore` | patch | Chores |
| `ci` | patch | Continuous Integration |
| `build` | patch | Build System |
| `BREAKING CHANGE` or `!` | major | BREAKING CHANGES |

### Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Examples

```bash
feat(auth): add OAuth2 support
fix(api): resolve memory leak in webhook handler
feat!: remove deprecated methods
```

## Workspace Configuration

Configure workspaces in your root `package.json`:

```json
{
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

Or with object format:

```json
{
  "workspaces": {
    "packages": [
      "packages/*",
      "apps/*"
    ]
  }
}
```

## Version Management

### Prerelease Support

The tool automatically detects and preserves prerelease identifiers:

- `2.2.2-alpha` + patch → `2.2.3-alpha`
- `2.2.2-alpha` + minor → `2.3.0-alpha`
- `2.2.2-alpha` + major → `3.0.0-alpha`

### Dependency Updates

Intra-project dependencies are updated while preserving version range operators:

- `^1.0.0` → `^2.1.0`
- `~1.0.0` → `~2.1.0`
- `>=1.0.0` → `>=2.1.0`
- `file:../path` → unchanged (local file references preserved)

### Private Packages

- **Main Changelog**: Private packages are excluded from the root `CHANGELOG.md`
- **Individual Changelogs**: All packages get their workspace-specific `CHANGELOG.md` updated
- **Version Bumping**: Private packages receive version updates like public packages

### Changelog Filtering

The tool automatically excludes certain types of changes from changelogs:

- **Development Dependencies**: Changes to `devDependencies` don't appear in changelogs
- **Internal Tooling**: Build, CI, and development-related commits are filtered out
- **Private Package Changes**: Private packages don't contribute to the main changelog

## Example Output

### Root CHANGELOG.md
```markdown
# Changelog

## [2.1.0](https://github.com/user/repo/compare/v2.0.0...v2.1.0) (2024-01-15)

### Features

- **api** add new authentication endpoint ([abc1234](https://github.com/user/repo/commit/abc1234))
- **ui** implement dark mode toggle ([def5678](https://github.com/user/repo/commit/def5678))

### Bug Fixes

- **core** fix memory leak in event handlers ([ghi9012](https://github.com/user/repo/commit/ghi9012))
```

### Workspace CHANGELOG.md
```markdown
# Changelog

## [2.1.0](https://github.com/user/repo/compare/v2.0.0...v2.1.0) (2024-01-15)

### Features

- add new authentication endpoint ([abc1234](https://github.com/user/repo/commit/abc1234))

### Bug Fixes

- fix memory leak in event handlers ([ghi9012](https://github.com/user/repo/commit/ghi9012))
```

## Requirements

- Node.js 23+ (uses experimental glob feature)
- Git repository with conventional commits
- npm workspaces setup

## License

Apache-2.0

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Related

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Node.js Glob API](https://nodejs.org/api/fs.html#fsglobsyncpattern-options)