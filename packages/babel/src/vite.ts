/**
 * Vite plugin for tailwind-expand.
 *
 * This plugin transforms @expand blocks so Tailwind can process them:
 * 1. Extracts alias definitions from @expand blocks
 * 2. Resolves alias references in @apply (e.g., TypographyCaption → text-xs font-bold)
 * 3. Converts @expand blocks to standard CSS rules Tailwind can process
 *
 * Usage:
 * ```ts
 * // vite.config.ts
 * import tailwindExpandVite from 'tailwind-expand/vite'
 * import tailwindcss from '@tailwindcss/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     tailwindExpandVite(),
 *     tailwindcss(),
 *     // ...
 *   ],
 * })
 * ```
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export default function tailwindExpandVite() {
  // Store collected variant-prefixed utilities from JSX files
  const variantUtilities = new Set<string>();
  // Store expanded aliases for resolving variants
  let expandedAliases: AliasMap = {};
  let rootDir = '';

  return {
    name: 'tailwind-expand',
    enforce: 'pre' as const,

    configResolved(config: { root: string }) {
      rootDir = config.root;
    },

    transform(code: string, id: string) {
      if (!id.endsWith('.css')) {
        return null;
      }

      if (!code.includes('@expand')) {
        return null;
      }

      // Extract and expand aliases from CSS
      const aliases = extractAliases(code);
      expandedAliases = expandAliases(aliases);

      // Scan source files for variant-prefixed alias usage
      if (rootDir) {
        scanSourceFiles(rootDir, expandedAliases, variantUtilities);
      }

      const transformed = transformExpandBlocks(code, expandedAliases, variantUtilities);

      return {
        code: transformed,
        map: null,
      };
    },
  };
}

/**
 * Recursively scan source files for variant-prefixed alias usage
 */
function scanSourceFiles(
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

export interface AliasMap {
  [name: string]: string;
}

/**
 * Collect variant-prefixed alias usage from JSX/TSX files
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
 * Transform @expand blocks:
 * 1. First pass: extract all alias definitions
 * 2. Second pass: resolve alias references and convert to standard CSS
 */
export function transformExpandBlocks(
  css: string,
  expanded: AliasMap,
  variantUtilities: Set<string>
): string {
  // Remove @expand blocks
  let result = stripExpandBlocks(css);

  // Collect all base utilities
  const allUtilities = new Set<string>();
  for (const utils of Object.values(expanded)) {
    utils.split(/\s+/).forEach(u => allUtilities.add(u));
  }

  // Add variant-prefixed utilities
  for (const util of variantUtilities) {
    allUtilities.add(util);
  }

  if (allUtilities.size > 0) {
    // Use @source inline to tell Tailwind to generate these utilities
    // This ensures the utility classes exist when Babel expands aliases in JSX
    result += `\n/* tailwind-expand: utilities for Tailwind to generate */\n@source inline("${[...allUtilities].join(' ')}");\n`;
  }

  return result;
}

/**
 * Extract alias definitions from @expand blocks
 */
export function extractAliases(css: string): AliasMap {
  const aliases: AliasMap = {};
  const expandRegex = /@expand\s+([A-Z][a-zA-Z0-9]*)\s*\{/g;
  let expandMatch;

  while ((expandMatch = expandRegex.exec(css)) !== null) {
    const componentName = expandMatch[1];
    const startIndex = expandMatch.index + expandMatch[0].length;
    let depth = 1;
    let i = startIndex;

    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }

    const blockContent = css.slice(startIndex, i - 1);
    parseExpandBlock(blockContent, componentName, aliases);
  }

  return aliases;
}

/**
 * Parse an @expand block and extract aliases
 */
function parseExpandBlock(content: string, prefix: string, aliases: AliasMap): void {
  // Find direct @apply at root level of this block
  const lines = content.split('\n');
  let currentSelector = '';
  let depth = 0;
  let currentContent = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (depth === 0) {
      // Check for @apply at root level
      const applyMatch = trimmed.match(/^@apply\s+([^;]+);?$/);
      if (applyMatch) {
        const utils = applyMatch[1].trim();
        aliases[prefix] = aliases[prefix] ? aliases[prefix] + ' ' + utils : utils;
        continue;
      }

      // Check for nested selector like &Md
      const selectorMatch = trimmed.match(/^(&[A-Z][a-zA-Z0-9]*)\s*\{$/);
      if (selectorMatch) {
        currentSelector = selectorMatch[1].slice(1); // Remove &
        depth = 1;
        currentContent = '';
        continue;
      }
    }

    if (depth > 0) {
      // Inside nested block
      for (const char of trimmed) {
        if (char === '{') depth++;
        else if (char === '}') depth--;
      }

      if (depth > 0) {
        currentContent += line + '\n';
      } else {
        // End of nested block
        const aliasName = prefix + currentSelector;
        const applyMatch = currentContent.match(/@apply\s+([^;]+);/);
        if (applyMatch) {
          aliases[aliasName] = applyMatch[1].trim();
        }
        currentSelector = '';
        currentContent = '';
      }
    }
  }
}

/**
 * Recursively expand alias references
 */
export function expandAliases(aliases: AliasMap): AliasMap {
  const expanded: AliasMap = {};
  const resolving = new Set<string>();

  function resolve(name: string): string {
    if (expanded[name]) return expanded[name];
    if (!aliases[name]) return name; // Not an alias, return as-is
    if (resolving.has(name)) return ''; // Circular, skip

    resolving.add(name);
    const tokens = aliases[name].split(/\s+/);
    const resolved = tokens.map(token => {
      // Check if token is an alias (starts with uppercase)
      if (/^[A-Z]/.test(token)) {
        return resolve(token);
      }
      return token;
    }).filter(Boolean);

    resolving.delete(name);
    expanded[name] = resolved.join(' ');
    return expanded[name];
  }

  for (const name of Object.keys(aliases)) {
    resolve(name);
  }

  return expanded;
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
