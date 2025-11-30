export { extract, extractFromCSS, extractFromRoot } from './extractor';
export { expand } from './expander';
export { collectVariantAliases, scanSourceFiles } from './scanner';
export { CAMEL_CASE_REGEX, isCamelCase } from './utils';
export type {
  AliasMap,
  ExpandOptions,
  ExpandPluginOptions,
  ExtractorResult,
  MergerFn,
} from './types';
