import type { PluginCreator, Root, Result, AtRule } from 'postcss';
import { resolve } from 'path';
import {
  extractFromRoot,
  expand,
  scanSourceFiles,
  generateCssClasses,
  type MergerFn,
} from '@tailwind-expand/core';

export interface PostcssPluginOptions {
  /**
   * Root directory to scan for variant-prefixed alias usage.
   * Defaults to process.cwd()
   */
  root?: string;
  /**
   * Optional merge function to resolve conflicting utilities.
   * Typically tailwind-merge's twMerge or a custom extendTailwindMerge.
   *
   * @example
   * import { twMerge } from 'tailwind-merge';
   * { mergerFn: twMerge }
   */
  mergerFn?: MergerFn;
}

/**
 * PostCSS plugin that processes @expand blocks.
 * This should run BEFORE Tailwind processes the CSS.
 *
 * It:
 * 1. Extracts alias definitions from @expand blocks
 * 2. Resolves nested alias references (e.g., TypographyCaption in Button)
 * 3. Scans source files for variant-prefixed alias usage (e.g., lg:ButtonMd)
 * 4. Generates @source inline() for Tailwind to include the utilities
 * 5. Removes @expand blocks
 *
 * Usage:
 * ```js
 * // postcss.config.mjs
 * export default {
 *   plugins: {
 *     "@tailwind-expand/postcss": {},
 *     "@tailwindcss/postcss": {},
 *   },
 * };
 * ```
 *
 * @example
 * // postcss.config.mjs with tailwind-merge
 * import { twMerge } from 'tailwind-merge';
 *
 * export default {
 *   plugins: {
 *     "@tailwind-expand/postcss": { mergerFn: twMerge },
 *     "@tailwindcss/postcss": {},
 *   },
 * };
 */
const postcssPlugin: PluginCreator<PostcssPluginOptions> = (options = {}) => {
  const rootDir = options.root || process.cwd();
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    postcssPlugin: 'tailwind-expand',
    Once(root: Root, { result }: { result: Result }) {
      // Check for @expand blocks by walking the AST (no string conversion)
      let hasExpand = false;
      root.walkAtRules('expand', () => {
        hasExpand = true;
        return false; // Stop walking after first match
      });

      if (!hasExpand) {
        return;
      }

      // Extract aliases directly from AST (no string conversion)
      const aliases = extractFromRoot(root);
      const expanded = expand(aliases, { mergerFn: options.mergerFn });

      // Collect all utilities (sorted for deterministic output)
      const allUtilities = new Set<string>();
      for (const utils of Object.values(expanded)) {
        utils.split(/\s+/).forEach((u) => { if (u) allUtilities.add(u); });
      }

      // Scan source files for variant-prefixed alias usage
      const scannedFiles = scanSourceFiles(rootDir, expanded, allUtilities);

      // Register scanned source files as dependencies
      for (const file of scannedFiles) {
        result.messages.push({
          type: 'dependency',
          plugin: 'tailwind-expand',
          file: resolve(file),
          parent: result.opts.from,
        });
      }

      // Remove @expand blocks
      root.walkAtRules('expand', (atRule) => {
        atRule.remove();
      });

      // Find the last @import/@tailwind/@theme directive for insertion point
      let lastDirective: AtRule | undefined;
      root.walkAtRules((atRule) => {
        if (['import', 'tailwind', 'theme'].includes(atRule.name)) {
          lastDirective = atRule;
        }
      });

      if (isDev) {
        // DEVELOPMENT: Generate CSS classes with @apply for HMR support
        // Tailwind will process these and generate actual CSS
        // className="Button" works via CSS (full HMR, no SWC needed)
        const cssClasses = generateCssClasses(expanded);

        if (cssClasses) { // Only insert if there are CSS classes to add
          if (lastDirective) {
            lastDirective.after(`\n/* tailwind-expand: dev classes */\n${cssClasses}`);
          } else if (root.nodes?.[0]) {
            root.nodes[0].before(`/* tailwind-expand: dev classes */\n${cssClasses}\n`);
          }
        }
      } else {
        // PRODUCTION: Generate @source inline() for Tailwind
        // SWC plugin will inline classes into JSX
        if (allUtilities.size > 0) {
          const sortedUtilities = [...allUtilities].sort();
          const sourceInline = `@source inline("${sortedUtilities.join(' ')}");`;

          if (lastDirective) {
            lastDirective.after(`\n/* tailwind-expand */\n${sourceInline}`);
          } else if (root.nodes?.[0]) {
            root.nodes[0].before(`/* tailwind-expand */\n${sourceInline}\n`);
          }
        }
      }
    },
  };
};

postcssPlugin.postcss = true;

export default postcssPlugin;

export type { MergerFn };
