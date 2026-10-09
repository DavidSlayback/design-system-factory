/** Join class parts, dropping falsy fragments. Kept tiny on purpose. */
export function dsfClasses(...parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}
