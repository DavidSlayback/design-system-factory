#!/usr/bin/env node
// dsf — Design System Factory CLI.
//
// Stdlib-only on purpose (node:util parseArgs, node:fs, node:crypto): the CLI
// scaffolds iteration directories and must run anywhere the monorepo is
// checked out, without a compile step.
import { parseArgs } from "node:util";
import { relative } from "node:path";
import { scaffoldIteration, tokensRootFrom } from "../lib/scaffold.mjs";

const USAGE = `dsf — Design System Factory CLI

Usage:
  dsf iteration new <name> [--tokens-dir <dir>]
  dsf --help

Options:
  --tokens-dir <dir>  Token package root (default: the @dsf/tokens workspace package)
  -h, --help          Show this help

Commands:
  iteration new <name>
      Scaffold packages/tokens/iterations/<name>/ from the core semantic
      defaults. The iteration builds identically to the base until you add
      overrides, and duplicate names are rejected.`;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h", default: false },
    "tokens-dir": { type: "string" },
  },
});

if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const [command, subcommand, name, ...extra] = positionals;

if (command !== "iteration" || subcommand !== "new") {
  fail(
    positionals.length === 0
      ? "no command given\n\n" + USAGE
      : `unknown command "${positionals.join(" ")}"\n\n` + USAGE,
  );
}
if (name === undefined) {
  fail(`"dsf iteration new" requires a name: dsf iteration new <name>\n\n${USAGE}`);
}
if (extra.length > 0) {
  fail(`unexpected arguments: ${extra.join(" ")}\n\n${USAGE}`);
}

let tokensRoot;
try {
  tokensRoot = values["tokens-dir"] ?? tokensRootFrom(import.meta.url);
} catch (error) {
  fail(
    `could not locate the @dsf/tokens workspace package (${error.message}) — run inside the monorepo or pass --tokens-dir <dir>`,
  );
}

try {
  const { target } = await scaffoldIteration({ name, tokensRoot });
  const displayTarget = relative(process.cwd(), target) || target;
  console.log(`✓ created iteration "${name}" in ${displayTarget}`);
  console.log("  next: override semantic tokens in overrides.tokens.json, then run pnpm build");
} catch (error) {
  fail(error.message);
}
