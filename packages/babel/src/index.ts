import type { PluginObj } from '@babel/core';
import { extract, expand, type AliasMap, type ExpandPluginOptions } from '@tailwind-expand/core';
import { createBabelVisitor } from './visitor';

// Cache for alias maps (keyed by CSS content hash)
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

  // Use cache if CSS hasn't changed
  let expandedAliases: AliasMap;

  if (cache.has(hash)) {
    expandedAliases = cache.get(hash)!;
  } else {
    expandedAliases = expand(rawAliases);
    cache.set(hash, expandedAliases);
  }

  return createBabelVisitor(expandedAliases);
}

/**
 * Creates a Babel plugin tuple for use in babel config.
 *
 * @example
 * // vite.config.ts
 * react({
 *   babel: {
 *     plugins: [babel({ cssPath: './src/globals.css' })],
 *   },
 * })
 */
export function babel(
  options: ExpandPluginOptions
): [typeof babelPlugin, ExpandPluginOptions] {
  return [babelPlugin, options];
}

// Export types for consumers
export type { ExpandPluginOptions, AliasMap };
