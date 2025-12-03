/**
 * Vite plugin for tailwind-expand.
 *
 * This plugin transforms @expand blocks so Tailwind can process them:
 * 1. Extracts alias definitions from @expand blocks
 * 2. Resolves alias references in @apply (e.g., TypographyCaption → text-xs font-bold)
 * 3. Generates @source inline() for Tailwind to include all utilities
 *
 * Pair with @tailwind-expand/babel to expand aliases in JSX.
 * In development, aliases are preserved for debugging (Button text-sm ...).
 * In production, only utilities are output for smaller bundles.
 *
 * Usage:
 * ```ts
 * // vite.config.ts
 * import tailwindExpandVite from '@tailwind-expand/vite'
 * import tailwindcss from '@tailwindcss/vite'
 * import tailwindExpandBabel from '@tailwind-expand/babel'
 * import { twMerge } from 'tailwind-merge'
 *
 * export default defineConfig({
 *   plugins: [
 *     tailwindExpandVite({ mergerFn: twMerge }),
 *     tailwindcss(),
 *     react({
 *       babel: {
 *         plugins: [tailwindExpandBabel({ cssPath: './src/globals.css', mergerFn: twMerge })],
 *       },
 *     }),
 *   ],
 * })
 * ```
 */

import type { ViteDevServer, HmrContext } from 'vite';
import { existsSync } from 'fs';
import {
  extractFromCSS,
  expand,
  scanSourceFiles,
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
  // Track CSS files with @expand blocks for HMR
  const expandCssFiles = new Set<string>();
  let server: ViteDevServer | null = null;

  return {
    name: 'tailwind-expand',
    enforce: 'pre' as const,

    configResolved(config: { root: string }) {
      rootDir = config.root;
    },

    configureServer(devServer: ViteDevServer) {
      server = devServer;
      // Clear tracked CSS files on server restart to prevent memory leaks
      // from deleted/renamed files in long-running dev sessions
      expandCssFiles.clear();
    },

    transform(code: string, id: string) {
      if (!id.endsWith('.css')) {
        return null;
      }

      if (!code.includes('@expand')) {
        // Remove from tracking if file no longer has @expand blocks
        expandCssFiles.delete(id);
        return null;
      }

      // Track this CSS file for HMR
      expandCssFiles.add(id);

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
        variantUtilities
      );

      return {
        code: transformed,
        map: null,
      };
    },

    async handleHotUpdate(ctx: HmrContext) {
      const { file } = ctx;

      // The server may be null during build or before configureServer runs.
      if (!server) {
        return ctx.modules;
      }

      // Handle file deletion: remove from tracking and restart
      if (expandCssFiles.has(file) && !existsSync(file)) {
        expandCssFiles.delete(file);
        await server.restart();
        return [];
      }

      // If a CSS file with @expand blocks changed, restart server
      // to clear all caches including @vitejs/plugin-react's babel cache
      if (expandCssFiles.has(file)) {
        await server.restart();
        return [];
      }

      // For non-tracked files, proceed with default HMR handling
      return ctx.modules;
    },
  };
}

export type { MergerFn };

/**
 * Transform @expand blocks by stripping them and generating @source inline()
 * for Tailwind to process all utilities.
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
    utils.split(/\s+/).forEach((u: string) => {
      if (u) allUtilities.add(u);
    });
  }

  // Add variant-prefixed utilities
  for (const util of variantUtilities) {
    allUtilities.add(util);
  }

  // Generate @source inline() for Tailwind to process
  if (allUtilities.size > 0) {
    const sortedUtilities = [...allUtilities].sort();
    result += `\n/* tailwind-expand */\n@source inline("${sortedUtilities.join(' ')}");\n`;
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
