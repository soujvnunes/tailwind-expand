import { readFileSync } from 'fs';
import { dirname, join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { extractFromCSS, expand, type MergerFn } from '@tailwind-expand/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const absolutePath = resolve(join(__dirname, '..', 'tailwind_expand_swc.wasm'));

// Use relative path for Turbopack compatibility (https://github.com/vercel/next.js/issues/78156)
const wasmPath = relative(process.cwd(), absolutePath);

export interface SwcPluginOptions {
  /**
   * Path to the CSS file containing @expand definitions
   */
  cssPath: string;
  /**
   * Optional merge function to resolve conflicting utilities.
   * Typically tailwind-merge's twMerge or a custom extendTailwindMerge.
   */
  mergerFn?: MergerFn;
}

/**
 * Creates an SWC plugin configuration for tailwind-expand.
 *
 * This function reads the CSS file, extracts and expands aliases using core,
 * and returns the plugin tuple ready for SWC configuration.
 *
 * Works with any SWC-based tool:
 * - Next.js (Turbopack)
 * - swc-loader (Webpack)
 * - @swc/core
 * - Rspack
 *
 * @example
 * ```js
 * // next.config.js
 * import tailwindExpandSWC from '@tailwind-expand/swc';
 *
 * export default {
 *   experimental: {
 *     swcPlugins: [tailwindExpandSWC({ cssPath: './app/globals.css' })]
 *   }
 * }
 * ```
 *
 * @example
 * ```js
 * // next.config.js with tailwind-merge
 * import tailwindExpandSWC from '@tailwind-expand/swc';
 * import { twMerge } from 'tailwind-merge';
 *
 * export default {
 *   experimental: {
 *     swcPlugins: [tailwindExpandSWC({ cssPath: './app/globals.css', mergerFn: twMerge })]
 *   }
 * }
 * ```
 *
 * @example
 * ```js
 * // rspack.config.js
 * import tailwindExpandSWC from '@tailwind-expand/swc';
 *
 * module.exports = {
 *   module: {
 *     rules: [{
 *       test: /\.[jt]sx?$/,
 *       use: {
 *         loader: 'builtin:swc-loader',
 *         options: {
 *           jsc: {
 *             experimental: {
 *               plugins: [tailwindExpandSWC({ cssPath: './src/styles.css' })]
 *             }
 *           }
 *         }
 *       }
 *     }]
 *   }
 * }
 * ```
 */
export default function tailwindExpandSWC(options: SwcPluginOptions): [string, { aliases: Record<string, string> }] {
  const { cssPath, mergerFn } = options;

  // Read CSS file and extract/expand aliases using core
  const cssContent = readFileSync(cssPath, 'utf-8');
  const rawAliases = extractFromCSS(cssContent, cssPath);
  const expandedAliases = expand(rawAliases, { mergerFn });

  // WASM receives pre-merged aliases
  return [wasmPath, { aliases: expandedAliases }];
}

export type { MergerFn };
