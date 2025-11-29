import type { PluginObj } from '@babel/core';
import { extract, expand, type AliasMap, type ExpandPluginOptions } from '@tailwind-expand/core';
import { createBabelVisitor } from './visitor';

// Cache for alias maps (keyed by CSS content hash)
const cache = new Map<string, AliasMap>();

export function babel(
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

// Export types for consumers
export type { ExpandPluginOptions, AliasMap };
