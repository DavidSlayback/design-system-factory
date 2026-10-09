import { cssVarName, fullValueRef, groupTokens, resolveTokenValue, type TokenLeaf } from "./model";
import { iterationInfos, primitivesByPath, primitiveLeaves, semanticLeaves } from "../source";
import "./docs.css";

function ValueCell({ value, type }: { value: unknown; type: string | undefined }) {
  if (value === null || value === undefined) {
    return <span className="dsf-docs-value-unresolved">unresolved</span>;
  }
  if (typeof value === "object") {
    return <pre style={{ margin: 0 }}>{JSON.stringify(value, null, 2)}</pre>;
  }
  const swatch = type === "color" && typeof value === "string" ? value : null;
  return (
    <>
      {swatch !== null ? (
        <span className="dsf-docs-swatch" style={{ background: swatch }} aria-hidden="true" />
      ) : null}
      <code>{String(value)}</code>
    </>
  );
}

function TokenValueCell({ leaf }: { leaf: TokenLeaf }) {
  const ref = fullValueRef(leaf.value);
  const resolved = resolveTokenValue(leaf.value, primitivesByPath);
  return (
    <>
      <ValueCell value={resolved} type={leaf.type} />
      {ref !== null ? <span className="dsf-docs-value-ref">{"{" + ref + "}"}</span> : null}
    </>
  );
}

function PrimitiveTable({ tokens }: { tokens: TokenLeaf[] }) {
  return (
    <table className="dsf-docs-table">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">CSS variable</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((leaf) => (
          <tr key={leaf.path.join(".")}>
            <td>
              <code>{leaf.path.join(".")}</code>
            </td>
            <td>
              <code>{cssVarName(leaf.path)}</code>
            </td>
            <td>
              <ValueCell value={leaf.value} type={leaf.type} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SemanticTable() {
  return (
    <table className="dsf-docs-table">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">CSS variable</th>
          <th scope="col">Core value</th>
          {iterationInfos.map((iteration) => (
            <th scope="col" key={iteration.id}>
              {iteration.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {semanticLeaves.map((leaf) => {
          const key = leaf.path.join(".");
          return (
            <tr key={key}>
              <td>
                <code>{key}</code>
              </td>
              <td>
                <code>{cssVarName(leaf.path)}</code>
              </td>
              <td>
                <TokenValueCell leaf={leaf} />
              </td>
              {iterationInfos.map((iteration) => {
                const override = iteration.overrides.find(
                  (candidate) => candidate.path.join(".") === key,
                );
                if (!override) {
                  return (
                    <td key={iteration.id}>
                      <span className="dsf-docs-value-core">core</span>
                    </td>
                  );
                }
                return (
                  <td key={iteration.id}>
                    <TokenValueCell leaf={override} />
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * The tokens documentation page: rendered entirely from the DTCG source
 * files (read at Vite build time — see source.ts), never hand-maintained.
 */
export function TokensDocs() {
  const primitiveGroups = groupTokens(primitiveLeaves);
  return (
    <>
      <section className="dsf-docs-section">
        <h2>Semantic tokens</h2>
        <p>
          Role-named mappings the component kit consumes. Components read only the CSS variables
          listed here, so an iteration re-maps roles — it never forks components.
        </p>
        <SemanticTable />
      </section>
      {primitiveGroups.map((group) => (
        <section className="dsf-docs-section" key={group.key}>
          <h2>
            Primitives · <code>{group.key}</code>
          </h2>
          <PrimitiveTable tokens={group.tokens} />
        </section>
      ))}
    </>
  );
}
