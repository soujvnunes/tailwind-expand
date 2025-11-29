import { readFileSync } from 'fs';
import { dirname, join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { extractFromCSS, expand } from '@tailwind-expand/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const absolutePath = resolve(join(__dirname, '..', 'tailwind_expand_swc.wasm'));

// Use relative path for Turbopack compatibility (https://github.com/vercel/next.js/issues/78156)
const wasmPath = relative(process.cwd(), absolutePath);

export interface SwcPluginOptions {
  /**
   * Path to the CSS file containing @expand definitions
   */
  cssPath: string;
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
 * import { swc } from '@tailwind-expand/swc';
 *
 * export default {
 *   experimental: {
 *     swcPlugins: [swc({ cssPath: './app/globals.css' })]
 *   }
 * }
 * ```
 *
 * @example
 * ```js
 * // rspack.config.js
 * import { swc } from '@tailwind-expand/swc';
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
 *               plugins: [swc({ cssPath: './src/styles.css' })]
 *             }
 *           }
 *         }
 *       }
 *     }]
 *   }
 * }
 * ```
 */
export function swc(options: SwcPluginOptions): [string, { aliases: Record<string, string> }] {
  const { cssPath } = options;

  // Read CSS file and extract/expand aliases using core
  const cssContent = readFileSync(cssPath, 'utf-8');
  const rawAliases = extractFromCSS(cssContent, cssPath);
  const expandedAliases = expand(rawAliases);

  return [wasmPath, { aliases: expandedAliases }];
}
