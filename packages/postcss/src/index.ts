import type { PluginCreator, Root } from 'postcss';
import {
  extractFromCSS,
  expand,
  scanSourceFiles,
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
 * 3. Scans source files for variant-prefixed aliases (e.g., lg:ButtonMd)
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

  return {
    postcssPlugin: 'tailwind-expand',
    Once(root: Root) {
      const css = root.toString();

      if (!css.includes('@expand')) {
        return;
      }

      // Extract and expand aliases using core
      const aliases = extractFromCSS(css);
      const expanded = expand(aliases, { mergerFn: options.mergerFn });

      // Collect all base utilities
      const allUtilities = new Set<string>();
      for (const utils of Object.values(expanded)) {
        utils.split(/\s+/).forEach((u) => allUtilities.add(u));
      }

      // Scan source files for variant-prefixed alias usage
      scanSourceFiles(rootDir, expanded, allUtilities);

      // Remove @expand blocks
      root.walkAtRules('expand', (atRule) => {
        atRule.remove();
      });

      // Add @source inline for Tailwind
      if (allUtilities.size > 0 && root.nodes?.[0]) {
        root.nodes[0].before(
          `/* tailwind-expand */\n@source inline("${[...allUtilities].join(' ')}");\n`
        );
      }
    },
  };
};

postcssPlugin.postcss = true;

export default postcssPlugin;

export type { MergerFn };
