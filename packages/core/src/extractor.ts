import postcss, { AtRule, Rule, Root } from 'postcss';
import fs from 'fs';
import crypto from 'crypto';
import type { AliasMap, ExtractorResult } from './types';
import { CAMEL_CASE_REGEX } from './utils';

export function extract(cssPath: string): ExtractorResult {
  const css = fs.readFileSync(cssPath, 'utf-8');
  const hash = crypto.createHash('md5').update(css).digest('hex');

  const root = postcss.parse(css, { from: cssPath });
  const aliases = extractFromRoot(root, cssPath);

  return { aliases, hash };
}

/**
 * Extract aliases from a CSS string.
 * Useful for build tool plugins that already have the CSS content.
 */
export function extractFromCSS(css: string, filename = 'unknown'): AliasMap {
  const root = postcss.parse(css, { from: filename });
  return extractFromRoot(root, filename);
}

/**
 * Extract aliases from a PostCSS Root node.
 * Useful for PostCSS plugins that already have the AST.
 */
export function extractFromRoot(root: Root, filename = 'unknown'): AliasMap {
  const aliases: AliasMap = {};

  root.walkAtRules('expand', (atRule: AtRule) => {
    const componentName = atRule.params.trim();
    validateCamelCase(componentName, filename, atRule);

    parseExpandBlock(atRule, componentName, aliases, filename);
  });

  return aliases;
}

function parseExpandBlock(
  atRule: AtRule,
  prefix: string,
  aliases: AliasMap,
  cssPath: string
): void {
  atRule.nodes?.forEach((node) => {
    if (node.type === 'atrule' && node.name === 'apply') {
      // Direct @apply in @expand
      mergeAlias(aliases, prefix, node.params.trim());
    } else if (node.type === 'rule') {
      // Nested rule like &Md { @apply ... }
      const selector = (node as Rule).selector.trim();

      if (selector.startsWith('&')) {
        const modifier = selector.slice(1); // Remove &
        const aliasName = prefix + modifier;

        validateCamelCase(aliasName, cssPath, node);

        // Only get direct @apply children, not nested ones
        node.nodes?.forEach((child) => {
          if (child.type === 'atrule' && (child as AtRule).name === 'apply') {
            mergeAlias(aliases, aliasName, (child as AtRule).params.trim());
          }
        });

        // Handle deeper nesting recursively
        node.nodes?.forEach((child) => {
          if (child.type === 'rule' && (child as Rule).selector.startsWith('&')) {
            parseNestedRule(child as Rule, aliasName, aliases, cssPath);
          }
        });
      }
    }
  });
}

function parseNestedRule(
  rule: Rule,
  parentName: string,
  aliases: AliasMap,
  cssPath: string
): void {
  const modifier = rule.selector.trim().slice(1);
  const aliasName = parentName + modifier;

  validateCamelCase(aliasName, cssPath, rule);

  // Only get direct @apply children, not nested ones
  rule.nodes?.forEach((child) => {
    if (child.type === 'atrule' && (child as AtRule).name === 'apply') {
      mergeAlias(aliases, aliasName, (child as AtRule).params.trim());
    }
  });

  // Continue recursion for deeper nesting
  rule.nodes?.forEach((child) => {
    if (child.type === 'rule' && (child as Rule).selector.startsWith('&')) {
      parseNestedRule(child as Rule, aliasName, aliases, cssPath);
    }
  });
}

function mergeAlias(aliases: AliasMap, name: string, utilities: string): void {
  if (aliases[name]) {
    aliases[name] += ' ' + utilities;
  } else {
    aliases[name] = utilities;
  }
}

function validateCamelCase(name: string, file: string, node: { source?: { start?: { line?: number } } }): void {
  if (!CAMEL_CASE_REGEX.test(name)) {
    const line = node.source?.start?.line || 'unknown';
    throw new Error(
      `[tailwind-expand] Invalid alias name "${name}" at ${file}:${line}. ` +
      `Alias names must be CamelCase (e.g., "Button", "TypographyHeading").`
    );
  }
}
