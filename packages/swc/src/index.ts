import { dirname, join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { extract, expand, type ExpandPluginOptions } from '@tailwind-expand/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const absolutePath = resolve(join(__dirname, '..', 'tailwind_expand_swc.wasm'));

// Use relative path for Turbopack compatibility (https://github.com/vercel/next.js/issues/78156)
const wasmPath = relative(process.cwd(), absolutePath);

/**
 * Creates an SWC plugin configuration for tailwind-expand.
 *
 * Transforms className="Button" → className="text-xs font-bold ..."
 *
 * For HMR support in development, only include this plugin in production builds.
 * PostCSS will generate CSS classes (.Button { ... }) for development.
 *
 * Works with any SWC-based tool:
 * - Next.js (Turbopack)
 * - swc-loader (Webpack)
 * - @swc/core
 * - Rspack
 *
 * @example
 * ```js
 * // next.config.js - Production only for HMR support
 * import tailwindExpandSWC from '@tailwind-expand/swc';
 * import { twMerge } from 'tailwind-merge';
 *
 * const isProd = process.env.NODE_ENV === 'production';
 *
 * export default {
 *   experimental: {
 *     swcPlugins: isProd
 *       ? [tailwindExpandSWC({ cssPath: './app/globals.css', mergerFn: twMerge })]
 *       : []
 *   }
 * }
 * ```
 *
 * @example
 * ```js
 * // next.config.js - With debug mode in development
 * import tailwindExpandSWC from '@tailwind-expand/swc';
 * import { twMerge } from 'tailwind-merge';
 *
 * const isProd = process.env.NODE_ENV === 'production';
 *
 * export default {
 *   experimental: {
 *     swcPlugins: [
 *       tailwindExpandSWC({
 *         cssPath: './app/globals.css',
 *         mergerFn: twMerge,
 *         debug: !isProd // Show data-expand in development
 *       })
 *     ]
 *   }
 * }
 * ```
 */
export default function tailwindExpandSWC(
  options: ExpandPluginOptions
): [string, { aliases: Record<string, string>; debug: boolean }] {
  const { cssPath, mergerFn, debug = false } = options;

  // Extract aliases from CSS at config time
  const absoluteCssPath = resolve(cssPath);
  const { aliases: rawAliases } = extract(absoluteCssPath);
  const aliases = expand(rawAliases, { mergerFn });

  return [wasmPath, { aliases, debug }];
}
