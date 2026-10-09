# @dsf/cli

The Design System Factory CLI. Runtime dependency: `@dsf/tokens` only — the
binary itself is stdlib Node (parseArgs, fs, crypto), no compile step.

## Usage

```sh
# From the repo root (workspace bin):
pnpm --filter @dsf/cli exec dsf --help

# Or directly:
node packages/cli/bin/dsf.mjs iteration new <name>
```

### `dsf iteration new <name>`

Scaffolds `packages/tokens/iterations/<name>/` from core defaults:

- `overrides.tokens.json` — an **empty** semantic override set. The iteration
  builds identically to the base semantics until you edit it; the semantic
  tree is never copied (that is the fork the factory exists to avoid).
- `meta.json` — `label` (derived from the name) and `description`.

Then edit `overrides.tokens.json`: every path must already exist in
`tokens/semantic/`, and values may be literals or full `{primitive}`
references. `pnpm build` fails loudly on unknown paths, primitive overrides,
type changes, and cycles, naming the file and token path.

Names must be lowercase kebab-case (`/^[a-z]+(-[a-z]+)*$/`) — they become
directory names and `[data-iteration="…"]` selectors. Duplicate names are
rejected.

Options: `--tokens-dir <dir>` overrides the token package root (defaults to
the `@dsf/tokens` workspace package resolved from this CLI's install).
