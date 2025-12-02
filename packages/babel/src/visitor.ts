import type { PluginObj, NodePath } from '@babel/core';
import type * as t from '@babel/types';
import { applyVariantPrefix, type AliasMap } from '@tailwind-expand/core';

export function createBabelVisitor(aliases: AliasMap, debug: boolean = false): PluginObj {
  return {
    name: 'tailwind-expand',
    visitor: {
      JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
        const classNameAttr = path.node.attributes.find(
          (attr): attr is t.JSXAttribute =>
            attr.type === 'JSXAttribute' && isClassNameAttribute(attr.name)
        );

        if (!classNameAttr || !classNameAttr.value) return;

        // Track expanded aliases for data-expand attribute
        const expandedAliases = new Set<string>();

        const value = classNameAttr.value;

        if (value.type === 'StringLiteral') {
          value.value = expandClassString(value.value, aliases, expandedAliases);
        } else if (
          value.type === 'JSXExpressionContainer' &&
          value.expression.type !== 'JSXEmptyExpression'
        ) {
          transformExpression(value.expression, aliases, expandedAliases);
        }

        // Add data-expand attribute if debug mode and aliases were expanded
        if (debug && expandedAliases.size > 0) {
          const dataExpandAttr: t.JSXAttribute = {
            type: 'JSXAttribute',
            name: {
              type: 'JSXIdentifier',
              name: 'data-expand',
            },
            value: {
              type: 'StringLiteral',
              value: [...expandedAliases].sort().join(' '),
            },
          };
          path.node.attributes.push(dataExpandAttr);
        }
      },
    },
  };
}

function isClassNameAttribute(name: t.JSXIdentifier | t.JSXNamespacedName): boolean {
  if (name.type !== 'JSXIdentifier') return false;
  return ['className', 'class', 'classes'].includes(name.name);
}

function transformExpression(
  expr: t.Expression,
  aliases: AliasMap,
  expandedAliases: Set<string>
): void {
  switch (expr.type) {
    case 'StringLiteral':
      expr.value = expandClassString(expr.value, aliases, expandedAliases);
      break;

    case 'TemplateLiteral':
      expr.quasis.forEach((quasi) => {
        if (quasi.value.raw) {
          quasi.value.raw = expandClassString(quasi.value.raw, aliases, expandedAliases);
          quasi.value.cooked = expandClassString(
            quasi.value.cooked || '',
            aliases,
            expandedAliases
          );
        }
      });
      break;

    case 'CallExpression':
      expr.arguments.forEach((arg) => {
        if (arg.type === 'StringLiteral') {
          arg.value = expandClassString(arg.value, aliases, expandedAliases);
        } else if (arg.type === 'LogicalExpression') {
          transformLogicalExpression(arg, aliases, expandedAliases);
        } else if (arg.type === 'ConditionalExpression') {
          transformConditionalExpression(arg, aliases, expandedAliases);
        }
      });
      break;

    case 'LogicalExpression':
      transformLogicalExpression(expr, aliases, expandedAliases);
      break;

    case 'ConditionalExpression':
      transformConditionalExpression(expr, aliases, expandedAliases);
      break;
  }
}

function transformLogicalExpression(
  expr: t.LogicalExpression,
  aliases: AliasMap,
  expandedAliases: Set<string>
): void {
  if (expr.right.type === 'StringLiteral') {
    expr.right.value = expandClassString(expr.right.value, aliases, expandedAliases);
  }
  if (expr.left.type === 'StringLiteral') {
    expr.left.value = expandClassString(expr.left.value, aliases, expandedAliases);
  }
}

function transformConditionalExpression(
  expr: t.ConditionalExpression,
  aliases: AliasMap,
  expandedAliases: Set<string>
): void {
  if (expr.consequent.type === 'StringLiteral') {
    expr.consequent.value = expandClassString(expr.consequent.value, aliases, expandedAliases);
  }
  if (expr.alternate.type === 'StringLiteral') {
    expr.alternate.value = expandClassString(expr.alternate.value, aliases, expandedAliases);
  }
}

/**
 * Core expansion logic for a class string
 * Handles: "Button lg:ButtonMd !ButtonMain"
 */
export function expandClassString(
  classString: string,
  aliases: AliasMap,
  expandedAliases: Set<string>
): string {
  const tokens = classString.split(/\s+/).filter(Boolean);
  const expandedTokens = tokens.map((token) => expandToken(token, aliases, expandedAliases));
  return expandedTokens.join(' ');
}

/**
 * Expand a single token, handling variants and modifiers
 * Examples:
 *   "Button" → "text-sm inline-flex"
 *   "lg:Button" → "lg:text-sm lg:inline-flex"
 *   "!Button" → "!text-sm !inline-flex"
 *   "lg:hover:Button" → "lg:hover:text-sm lg:hover:inline-flex"
 */
function expandToken(
  token: string,
  aliases: AliasMap,
  expandedAliases: Set<string>
): string {
  // Check for ! prefix
  let importantPrefix = '';
  let workingToken = token;

  if (workingToken.startsWith('!')) {
    importantPrefix = '!';
    workingToken = workingToken.slice(1);
  }

  // Split variant prefix from alias name
  // "lg:hover:Button" → prefix="lg:hover:", name="Button"
  const lastColonIndex = workingToken.lastIndexOf(':');
  let variantPrefix = '';
  let aliasName = workingToken;

  if (lastColonIndex !== -1) {
    variantPrefix = workingToken.slice(0, lastColonIndex + 1);
    aliasName = workingToken.slice(lastColonIndex + 1);
  }

  // Check if it's a known alias (CamelCase and in map)
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(aliasName) || !aliases[aliasName]) {
    return token;
  }

  // Track the full token (including variant prefix) for data-expand
  expandedAliases.add(token);

  // Expand the alias
  const utilities = aliases[aliasName].split(/\s+/);

  const expanded = utilities.map((util) => {
    const prefixedUtil = applyVariantPrefix(variantPrefix, util);
    return importantPrefix + prefixedUtil;
  });

  return expanded.join(' ');
}
