import type { PluginCreator } from 'postcss';

/**
 * PostCSS plugin that strips @expand blocks from CSS.
 * This should run BEFORE Tailwind processes the CSS.
 *
 * Usage:
 * ```js
 * // postcss.config.js
 * module.exports = {
 *   plugins: [
 *     require('tailwind-expand/postcss'),
 *     require('tailwindcss'),
 *   ],
 * };
 * ```
 */
const postcssPlugin: PluginCreator<void> = () => {
  return {
    postcssPlugin: 'tailwind-expand',
    AtRule: {
      expand: (atRule) => {
        // Remove @expand blocks entirely - they're only for the Babel plugin
        atRule.remove();
      },
    },
  };
};

postcssPlugin.postcss = true;

export default postcssPlugin;
