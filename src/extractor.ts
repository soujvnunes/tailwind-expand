import postcss, { AtRule, Rule } from 'postcss';
import fs from 'fs';
import crypto from 'crypto';
import type { AliasMap, ExtractorResult } from './types';
import { CAMEL_CASE_REGEX } from './utils';

export function extract(cssPath: string): ExtractorResult {
  const css = fs.readFileSync(cssPath, 'utf-8');
  const hash = crypto.createHash('md5').update(css).digest('hex');

  const aliases: AliasMap = {};

  const root = postcss.parse(css, { from: cssPath });

  root.walkAtRules('expand', (atRule: AtRule) => {
    const componentName = atRule.params.trim();
    validateCamelCase(componentName, cssPath, atRule);

    parseExpandBlock(atRule, componentName, aliases, cssPath);
  });

  return { aliases, hash };
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
