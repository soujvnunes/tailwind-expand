export interface AliasMap {
  [aliasName: string]: string; // alias → space-separated utilities
}

export interface ExpandPluginOptions {
  /** Path to CSS file containing @expand definitions */
  cssPath: string;
}

export interface ExtractorResult {
  aliases: AliasMap;
  hash: string; // For cache invalidation
}
