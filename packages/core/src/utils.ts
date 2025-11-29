export const CAMEL_CASE_REGEX = /^[A-Z][a-zA-Z0-9]*$/;

export function isCamelCase(str: string): boolean {
  return CAMEL_CASE_REGEX.test(str);
}
