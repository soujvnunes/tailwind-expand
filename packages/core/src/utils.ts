export const CAMEL_CASE_REGEX = /^[A-Z][a-zA-Z0-9]*$/;

export function isCamelCase(str: string): boolean {
  return CAMEL_CASE_REGEX.test(str);
}

/**
 * Apply variant prefix to utility, deduplicating overlapping variants.
 * e.g., applyVariantPrefix("hover:", "hover:bg-primary") → "hover:bg-primary"
 * e.g., applyVariantPrefix("dark:hover:", "hover:bg-primary") → "dark:hover:bg-primary"
 */
export function applyVariantPrefix(variantPrefix: string, utility: string): string {
  if (!variantPrefix) return utility;

  // "dark:hover:" → {"dark", "hover"}
  const prefixVariants = new Set(variantPrefix.slice(0, -1).split(':'));
  let result = utility;

  while (true) {
    const colonIdx = result.indexOf(':');
    if (colonIdx === -1) break;

    const firstVariant = result.slice(0, colonIdx);
    if (prefixVariants.has(firstVariant)) {
      result = result.slice(colonIdx + 1);
    } else {
      break;
    }
  }

  return variantPrefix + result;
}

/**
 * Generates CSS class rules from expanded aliases.
 * Used in development mode for HMR support.
 *
 * @example
 * Input: { Button: "text-xs font-bold", ButtonSm: "h-8 px-3" }
 * Output: ".Button { @apply text-xs font-bold; }\n.ButtonSm { @apply h-8 px-3; }"
 */
export function generateCssClasses(aliases: Record<string, string>): string {
  return Object.entries(aliases)
    .filter(([, utilities]) => utilities.trim())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, utilities]) => `.${name} { @apply ${utilities}; }`)
    .join('\n');
}
