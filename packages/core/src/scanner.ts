import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { AliasMap } from './types';
import { applyVariantPrefix } from './utils';

/**
 * Collect variant-prefixed alias usage from source code
 * e.g., lg:ButtonMd → collect lg:h-10 lg:px-4
 * e.g., dark:hover:ButtonMd → collect dark:hover:h-10 dark:hover:px-4
 */
export function collectVariantAliases(
  code: string,
  aliases: AliasMap,
  variantUtilities: Set<string>
): void {
  // Match variant:AliasName patterns with chained variants
  // e.g., lg:ButtonMd, hover:Button, dark:hover:ButtonMd, md:!ButtonSm
  const variantAliasRegex = /((?:[a-z][a-z0-9-]*:)+!?[A-Z][a-zA-Z0-9]*)/g;
  let match;

  while ((match = variantAliasRegex.exec(code)) !== null) {
    const fullMatch = match[1];
    // Extract variant prefix (with colon) and alias name using last colon
    const lastColonIndex = fullMatch.lastIndexOf(':');
    const variantPrefix = fullMatch.slice(0, lastColonIndex + 1);
    let aliasName = fullMatch.slice(lastColonIndex + 1);

    // Handle important modifier
    if (aliasName.startsWith('!')) {
      aliasName = aliasName.slice(1);
    }

    // If this is a known alias, expand it with the variant prefix
    if (aliases[aliasName]) {
      const utilities = aliases[aliasName].split(/\s+/);
      for (const util of utilities) {
        variantUtilities.add(applyVariantPrefix(variantPrefix, util));
      }
    }
  }
}

/**
 * Recursively scan source files for variant-prefixed alias usage.
 * Returns the list of scanned file paths for dependency registration.
 */
export function scanSourceFiles(
  dir: string,
  aliases: AliasMap,
  variantUtilities: Set<string>,
  scannedFiles: string[] = []
): string[] {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanSourceFiles(fullPath, aliases, variantUtilities, scannedFiles);
      } else if (/\.(jsx?|tsx?)$/.test(entry)) {
        scannedFiles.push(fullPath);
        const content = readFileSync(fullPath, 'utf-8');
        collectVariantAliases(content, aliases, variantUtilities);
      }
    }
  } catch {
    // Ignore errors
  }
  return scannedFiles;
}
