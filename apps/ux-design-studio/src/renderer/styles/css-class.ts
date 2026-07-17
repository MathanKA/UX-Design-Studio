/** Resolve a CSS Modules class under noUncheckedIndexedAccess. */
export function cssClass(
  value: string | undefined,
  name: string,
): string {
  if (!value) {
    throw new Error(`Missing CSS module class: ${name}`);
  }
  return value;
}
