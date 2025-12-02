import type { PluginObj } from '@babel/core';
import {
  extract,
  expand,
  type AliasMap,
  type ExpandPluginOptions,
  type MergerFn,
} from '@tailwind-expand/core';
import { createBabelVisitor } from './visitor';

// Cache for alias maps (keyed by CSS content hash + mergerFn presence)
const cache = new Map<string, AliasMap>();

function babelPlugin(
  _: unknown, // Babel API (unused)
  options: ExpandPluginOptions
): PluginObj {
  if (!options.cssPath) {
    throw new Error('[tailwind-expand] Missing required option: cssPath');
  }

  // Extract and expand aliases
  const { aliases: rawAliases, hash } = extract(options.cssPath);

  // Create cache key that includes mergerFn presence
  const cacheKey = `${hash}:${options.mergerFn ? 'merged' : 'raw'}`;

  // Use cache if CSS hasn't changed
  let expandedAliases: AliasMap;

  if (cache.has(cacheKey)) {
    expandedAliases = cache.get(cacheKey)!;
  } else {
    expandedAliases = expand(rawAliases, { mergerFn: options.mergerFn });
    cache.set(cacheKey, expandedAliases);
  }

  return createBabelVisitor(expandedAliases, options.debug ?? false);
}

/**
 * Creates a Babel plugin tuple for use in babel config.
 *
 * @example
 * // vite.config.ts
 * import tailwindExpandBabel from '@tailwind-expand/babel'
 *
 * react({
 *   babel: {
 *     plugins: [tailwindExpandBabel({ cssPath: './src/globals.css' })],
 *   },
 * })
 *
 * @example
 * // With tailwind-merge for conflict resolution
 * import { twMerge } from 'tailwind-merge'
 *
 * react({
 *   babel: {
 *     plugins: [tailwindExpandBabel({ cssPath: './src/globals.css', mergerFn: twMerge })],
 *   },
 * })
 */
export default function tailwindExpandBabel(
  options: ExpandPluginOptions
): [typeof babelPlugin, ExpandPluginOptions] {
  return [babelPlugin, options];
}

// Export types for consumers
export type { ExpandPluginOptions, AliasMap, MergerFn };
