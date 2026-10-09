const REF_PATTERN = /\{([^{}]+)\}/g;

/**
 * Extract every `{reference}` appearing in a token value. Composite values
 * (e.g. shadow objects) are walked recursively so nested refs are checked too.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function extractRefs(value) {
  const refs = [];
  const visit = (node) => {
    if (typeof node === "string") {
      for (const match of node.matchAll(REF_PATTERN)) refs.push(match[1]);
    } else if (node !== null && typeof node === "object") {
      for (const child of Object.values(node)) visit(child);
    }
  };
  visit(value);
  return refs;
}

/** The single reference a value consists of, or null when it is not one. */
function fullValueRef(value) {
  if (typeof value !== "string") return null;
  const match = /^\{([^{}]+)\}$/.exec(value);
  return match === null ? null : match[1];
}

/**
 * Validate the combined token graph. Fails loudly (as data, so callers decide
 * how to render) on unknown references, reference cycles, and type mismatches.
 * Every error message names the source file and the token path.
 *
 * @param {Map<string, {path: string[], type: string|undefined, value: unknown, file: string}>} tokens
 * @returns {Array<{kind: 'unknown-ref'|'cycle'|'type-mismatch', message: string}>}
 */
export function validateTokenGraph(tokens) {
  const errors = [];
  const paths = [...tokens.keys()].sort();

  // Unknown references: any {ref} in any value must point at a real token.
  for (const path of paths) {
    const token = tokens.get(path);
    for (const ref of extractRefs(token.value)) {
      if (!tokens.has(ref)) {
        errors.push({
          kind: "unknown-ref",
          message: `${token.file}: token "${path}" references unknown token "{${ref}}"`,
        });
      }
    }
  }

  // Cycles: follow full-value reference chains depth-first; a ref back to a
  // node on the current stack closes a cycle. Embedded refs inside composite
  // values do not form resolvable edges in v1 and are skipped here.
  const detectCycle = (path, state, stack) => {
    state.set(path, "visiting");
    stack.push(path);
    const token = tokens.get(path);
    const ref = fullValueRef(token.value);
    if (ref !== null && tokens.has(ref)) {
      if (state.get(ref) === "visiting") {
        const cycle = stack.slice(stack.indexOf(ref)).concat(ref);
        errors.push({
          kind: "cycle",
          message: `${token.file}: token "${path}" is in a reference cycle: ${cycle.join(" -> ")}`,
        });
      } else if (state.get(ref) === "unvisited") {
        detectCycle(ref, state, stack);
      }
    }
    stack.pop();
    state.set(path, "done");
  };
  const state = new Map(paths.map((path) => [path, "unvisited"]));
  for (const path of paths) {
    if (state.get(path) === "unvisited") detectCycle(path, state, []);
  }

  // Type mismatches: a token's type must match the type at the end of its
  // reference chain (e.g. a color token may not reference a spacing token).
  const resolvedType = (path, seen) => {
    if (seen.has(path)) return undefined; // cycle — already reported above
    seen.add(path);
    const token = tokens.get(path);
    const ref = fullValueRef(token.value);
    if (ref === null || !tokens.has(ref)) return token.type;
    return resolvedType(ref, seen);
  };
  for (const path of paths) {
    const token = tokens.get(path);
    const ref = fullValueRef(token.value);
    if (ref === null || !tokens.has(ref)) continue;
    const targetType = resolvedType(ref, new Set([path]));
    if (targetType !== undefined && targetType !== token.type) {
      errors.push({
        kind: "type-mismatch",
        message: `${token.file}: token "${path}" is "${token.type}" but references "${ref}" of type "${targetType}"`,
      });
    }
  }

  // Stable order so repeated runs (and CI diffs) see identical output.
  return errors.sort((a, b) => (a.message < b.message ? -1 : a.message > b.message ? 1 : 0));
}
