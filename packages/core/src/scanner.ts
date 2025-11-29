import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { AliasMap } from './types';

/**
 * Collect variant-prefixed alias usage from source code
 * e.g., lg:ButtonMd → collect lg:h-10 lg:px-4
 */
export function collectVariantAliases(
  code: string,
  aliases: AliasMap,
  variantUtilities: Set<string>
): void {
  // Match variant:AliasName patterns (e.g., lg:ButtonMd, hover:Button, md:!ButtonSm)
  const variantAliasRegex = /([a-z][a-z0-9-]*:!?[A-Z][a-zA-Z0-9]*)/g;
  let match;

  while ((match = variantAliasRegex.exec(code)) !== null) {
    const fullMatch = match[1];
    // Extract variant and alias name
    const colonIndex = fullMatch.indexOf(':');
    const variant = fullMatch.slice(0, colonIndex);
    let aliasName = fullMatch.slice(colonIndex + 1);

    // Handle important modifier
    if (aliasName.startsWith('!')) {
      aliasName = aliasName.slice(1);
    }

    // If this is a known alias, expand it with the variant prefix
    if (aliases[aliasName]) {
      const utilities = aliases[aliasName].split(/\s+/);
      for (const util of utilities) {
        variantUtilities.add(`${variant}:${util}`);
      }
    }
  }
}

/**
 * Recursively scan source files for variant-prefixed alias usage
 */
export function scanSourceFiles(
  dir: string,
  aliases: AliasMap,
  variantUtilities: Set<string>
): void {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanSourceFiles(fullPath, aliases, variantUtilities);
      } else if (/\.(jsx?|tsx?)$/.test(entry)) {
        const content = readFileSync(fullPath, 'utf-8');
        collectVariantAliases(content, aliases, variantUtilities);
      }
    }
  } catch {
    // Ignore errors
  }
}
