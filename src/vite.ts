/**
 * Vite plugin that strips @expand blocks from CSS before Tailwind processes it.
 * This should be placed BEFORE @tailwindcss/vite in the plugins array.
 *
 * Usage:
 * ```ts
 * // vite.config.ts
 * import tailwindExpandVite from 'tailwind-expand/vite'
 * import tailwindcss from '@tailwindcss/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     tailwindExpandVite(),
 *     tailwindcss(),
 *     // ...
 *   ],
 * })
 * ```
 */
export default function tailwindExpandVite() {
  return {
    name: 'tailwind-expand',
    enforce: 'pre' as const, // Run before other plugins

    transform(code: string, id: string) {
      // Only process CSS files
      if (!id.endsWith('.css')) {
        return null;
      }

      // Check if file contains @expand
      if (!code.includes('@expand')) {
        return null;
      }

      // Remove @expand blocks (including nested content)
      const transformed = removeExpandBlocks(code);

      return {
        code: transformed,
        map: null,
      };
    },
  };
}

/**
 * Remove all @expand blocks from CSS
 */
function removeExpandBlocks(css: string): string {
  let result = '';
  let i = 0;

  while (i < css.length) {
    // Look for @expand
    const expandIndex = css.indexOf('@expand', i);

    if (expandIndex === -1) {
      // No more @expand, append rest of file
      result += css.slice(i);
      break;
    }

    // Append everything before @expand
    result += css.slice(i, expandIndex);

    // Find the opening brace
    const braceStart = css.indexOf('{', expandIndex);
    if (braceStart === -1) {
      // Malformed, skip this @expand
      i = expandIndex + 7;
      continue;
    }

    // Find matching closing brace (handle nesting)
    let depth = 1;
    let j = braceStart + 1;

    while (j < css.length && depth > 0) {
      if (css[j] === '{') {
        depth++;
      } else if (css[j] === '}') {
        depth--;
      }
      j++;
    }

    // Move past the closing brace
    i = j;
  }

  return result;
}
