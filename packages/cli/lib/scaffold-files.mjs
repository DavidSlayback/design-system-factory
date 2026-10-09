// Scaffold templates: the files `dsf iteration new <name>` writes. Pure — no
// filesystem access here, so tests can assert exact content.
//
// The scaffold deliberately contains an EMPTY override set: the new iteration
// builds identically to the base semantics on its first build (spec V2 start
// state), and copying the semantic tier into every iteration would re-create
// exactly the fork the factory exists to avoid.

/**
 * @param {string} name - validated iteration name ("midnight" -> "Midnight")
 * @returns {string}
 */
export function labelFromName(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * @param {string} name - validated iteration name
 * @returns {Array<{name: string, content: string}>} files to write into the
 *   iteration directory, in write order
 */
export function scaffoldFiles(name) {
  return [
    {
      name: "overrides.tokens.json",
      content: `${JSON.stringify(
        {
          $description: `Semantic overrides for the ${name} iteration. Every path must already exist in tokens/semantic/; values may be literals or full {primitive} references. An empty override set builds identically to the base semantics.`,
        },
        null,
        2,
      )}\n`,
    },
    {
      name: "meta.json",
      content: `${JSON.stringify(
        { label: labelFromName(name), description: `The ${name} iteration.` },
        null,
        2,
      )}\n`,
    },
  ];
}
