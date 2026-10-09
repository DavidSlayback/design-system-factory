// jest-axe@11 ships JavaScript only (CommonJS, no bundled types and no
// DefinitelyTyped counterpart). This declares the installed surface this
// package consumes; `axe` resolves to axe-core's result object.
declare module "jest-axe" {
  import type { AxeResults } from "axe-core";

  export const axe: (
    html: Element,
    additionalOptions?: Record<string, unknown>,
  ) => Promise<AxeResults>;
}
