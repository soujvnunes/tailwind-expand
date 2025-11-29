/**
 * Vite plugin for tailwind-expand.
 *
 * This plugin transforms @expand blocks so Tailwind can process them:
 * 1. Extracts alias definitions from @expand blocks
 * 2. Resolves alias references in @apply (e.g., TypographyCaption → text-xs font-bold)
 * 3. Converts @expand blocks to standard CSS rules Tailwind can process
 *
 * Usage:
 * ```ts
 * // vite.config.ts
 * import { vite } from '@tailwind-expand/vite'
 * import tailwindcss from '@tailwindcss/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     vite(),
 *     tailwindcss(),
 *     // ...
 *   ],
 * })
 * ```
 */

import {
  extractFromCSS,
  expand,
  scanSourceFiles,
  type AliasMap,
} from '@tailwind-expand/core';

export function vite() {
  // Store collected variant-prefixed utilities from JSX files
  const variantUtilities = new Set<string>();
  // Store expanded aliases for resolving variants
  let expandedAliases: AliasMap = {};
  let rootDir = '';

  return {
    name: 'tailwind-expand',
    enforce: 'pre' as const,

    configResolved(config: { root: string }) {
      rootDir = config.root;
    },

    transform(code: string, id: string) {
      if (!id.endsWith('.css')) {
        return null;
      }

      if (!code.includes('@expand')) {
        return null;
      }

      // Extract and expand aliases from CSS using core
      const aliases = extractFromCSS(code);
      expandedAliases = expand(aliases);

      // Scan source files for variant-prefixed alias usage
      if (rootDir) {
        scanSourceFiles(rootDir, expandedAliases, variantUtilities);
      }

      const transformed = transformExpandBlocks(code, expandedAliases, variantUtilities);

      return {
        code: transformed,
        map: null,
      };
    },
  };
}

/**
 * Transform @expand blocks:
 * 1. First pass: extract all alias definitions
 * 2. Second pass: resolve alias references and convert to standard CSS
 */
function transformExpandBlocks(
  css: string,
  expanded: AliasMap,
  variantUtilities: Set<string>
): string {
  // Remove @expand blocks
  let result = stripExpandBlocks(css);

  // Collect all base utilities
  const allUtilities = new Set<string>();
  for (const utils of Object.values(expanded) as string[]) {
    utils.split(/\s+/).forEach((u: string) => allUtilities.add(u));
  }

  // Add variant-prefixed utilities
  for (const util of variantUtilities) {
    allUtilities.add(util);
  }

  if (allUtilities.size > 0) {
    // Use @source inline to tell Tailwind to generate these utilities
    // This ensures the utility classes exist when Babel expands aliases in JSX
    result += `\n/* tailwind-expand: utilities for Tailwind to generate */\n@source inline("${[...allUtilities].join(' ')}");\n`;
  }

  return result;
}

/**
 * Strip @expand blocks from CSS
 */
function stripExpandBlocks(css: string): string {
  let result = '';
  let i = 0;

  while (i < css.length) {
    const expandIndex = css.indexOf('@expand', i);

    if (expandIndex === -1) {
      result += css.slice(i);
      break;
    }

    result += css.slice(i, expandIndex);

    const braceStart = css.indexOf('{', expandIndex);
    if (braceStart === -1) {
      i = expandIndex + 7;
      continue;
    }

    let depth = 1;
    let j = braceStart + 1;

    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }

    i = j;
  }

  return result;
}
