export interface AliasMap {
  [aliasName: string]: string; // alias → space-separated utilities
}

/**
 * Function to merge conflicting Tailwind utilities.
 * Typically tailwind-merge's twMerge or a custom extendTailwindMerge.
 *
 * @example
 * import { twMerge } from 'tailwind-merge';
 * const mergerFn: MergerFn = twMerge;
 */
export type MergerFn = (utilities: string) => string;

export interface ExpandOptions {
  /** Optional merge function to resolve conflicting utilities */
  mergerFn?: MergerFn;
}

export interface ExpandPluginOptions {
  /** Path to CSS file containing @expand definitions */
  cssPath: string;
  /** Optional merge function to resolve conflicting utilities */
  mergerFn?: MergerFn;
}

export interface ExtractorResult {
  aliases: AliasMap;
  hash: string; // For cache invalidation
}
