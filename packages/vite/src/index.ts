/**
 * Vite plugin for tailwind-expand.
 *
 * This plugin transforms @expand blocks so Tailwind can process them:
 * 1. Extracts alias definitions from @expand blocks
 * 2. Resolves alias references in @apply (e.g., TypographyCaption → text-xs font-bold)
 * 3. In development: generates CSS classes for HMR support
 * 4. In production: generates @source inline() for Tailwind to process
 *
 * For production builds, pair with @tailwind-expand/babel to inline classes into JSX
 * for atomic CSS benefits (smaller bundles, DevTools transparency).
 *
 * Usage:
 * ```ts
 * // vite.config.ts
 * import tailwindExpandVite from '@tailwind-expand/vite'
 * import tailwindcss from '@tailwindcss/vite'
 * import tailwindExpandBabel from '@tailwind-expand/babel'
 * import { twMerge } from 'tailwind-merge'
 *
 * const isProd = process.env.NODE_ENV === 'production'
 *
 * export default defineConfig({
 *   plugins: [
 *     tailwindExpandVite({ mergerFn: twMerge }),
 *     tailwindcss(),
 *     react({
 *       babel: {
 *         // Only expand in production for atomic CSS benefits
 *         // In dev, CSS classes provide full HMR support
 *         plugins: isProd
 *           ? [tailwindExpandBabel({ cssPath: './src/globals.css', mergerFn: twMerge })]
 *           : [],
 *       },
 *     }),
 *   ],
 * })
 * ```
 */

import {
  extractFromCSS,
  expand,
  scanSourceFiles,
  generateCssClasses,
  type AliasMap,
  type MergerFn,
} from '@tailwind-expand/core';

export interface VitePluginOptions {
  /**
   * Optional merge function to resolve conflicting utilities.
   * Typically tailwind-merge's twMerge or a custom extendTailwindMerge.
   */
  mergerFn?: MergerFn;
}

export default function tailwindExpandVite(options: VitePluginOptions = {}) {
  // Store collected variant-prefixed utilities from JSX files
  const variantUtilities = new Set<string>();
  // Store expanded aliases for resolving variants
  let expandedAliases: AliasMap = {};
  let rootDir = '';
  let isDev = true;

  return {
    name: 'tailwind-expand',
    enforce: 'pre' as const,

    configResolved(config: { root: string; command: string }) {
      rootDir = config.root;
      isDev = config.command === 'serve';
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
      expandedAliases = expand(aliases, { mergerFn: options.mergerFn });

      // Scan source files for variant-prefixed alias usage
      if (rootDir) {
        scanSourceFiles(rootDir, expandedAliases, variantUtilities);
      }

      const transformed = transformExpandBlocks(
        code,
        expandedAliases,
        variantUtilities,
        isDev
      );

      return {
        code: transformed,
        map: null,
      };
    },
  };
}

export type { MergerFn };

/**
 * Transform @expand blocks:
 * - Development: generates CSS classes for HMR support
 * - Production: generates @source inline() for Tailwind to process
 */
function transformExpandBlocks(
  css: string,
  expanded: AliasMap,
  variantUtilities: Set<string>,
  isDev: boolean
): string {
  // Remove @expand blocks
  let result = stripExpandBlocks(css);

  // Collect all base utilities
  const allUtilities = new Set<string>();
  for (const utils of Object.values(expanded) as string[]) {
    utils.split(/\s+/).forEach((u: string) => {
      if (u) allUtilities.add(u);
    });
  }

  // Add variant-prefixed utilities
  for (const util of variantUtilities) {
    allUtilities.add(util);
  }

  if (isDev) {
    // DEVELOPMENT: Generate CSS classes with @apply for HMR support
    // Tailwind will process these and generate actual CSS
    // className="Button" works via CSS (full HMR, no Babel transform needed)
    const cssClasses = generateCssClasses(expanded);
    if (cssClasses) { // Only append if there are CSS classes
      result += `\n/* tailwind-expand: dev classes */\n${cssClasses}\n`;
    }
  } else {
    // PRODUCTION: Generate @source inline() for Tailwind
    // Babel plugin will inline classes into JSX for atomic CSS benefits
    if (allUtilities.size > 0) {
      const sortedUtilities = [...allUtilities].sort();
      result += `\n/* tailwind-expand */\n@source inline("${sortedUtilities.join(' ')}");\n`;
    }
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
