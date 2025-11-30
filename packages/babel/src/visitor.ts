import type { PluginObj, NodePath } from '@babel/core';
import type * as t from '@babel/types';
import { applyVariantPrefix, type AliasMap } from '@tailwind-expand/core';

export function createBabelVisitor(aliases: AliasMap): PluginObj {
  return {
    name: 'tailwind-expand',
    visitor: {
      JSXAttribute(path: NodePath<t.JSXAttribute>) {
        const name = path.node.name;

        // Only process className, class, classes
        if (!isClassNameAttribute(name)) return;

        const value = path.node.value;
        if (!value) return;

        if (value.type === 'StringLiteral') {
          // <div className="Button ButtonMd" />
          value.value = expandClassString(value.value, aliases);
        } else if (
          value.type === 'JSXExpressionContainer' &&
          value.expression.type !== 'JSXEmptyExpression'
        ) {
          // <div className={...} />
          transformExpression(value.expression, aliases);
        }
      },
    },
  };
}

function isClassNameAttribute(name: t.JSXIdentifier | t.JSXNamespacedName): boolean {
  if (name.type !== 'JSXIdentifier') return false;
  return ['className', 'class', 'classes'].includes(name.name);
}

function transformExpression(expr: t.Expression, aliases: AliasMap): void {
  switch (expr.type) {
    case 'StringLiteral':
      // className={"Button ButtonMd"}
      expr.value = expandClassString(expr.value, aliases);
      break;

    case 'TemplateLiteral':
      // className={`Button ${x} ButtonMd`}
      expr.quasis.forEach((quasi) => {
        if (quasi.value.raw) {
          quasi.value.raw = expandClassString(quasi.value.raw, aliases);
          quasi.value.cooked = expandClassString(quasi.value.cooked || '', aliases);
        }
      });
      break;

    case 'CallExpression':
      // className={cn("Button", condition && "ButtonMd")}
      expr.arguments.forEach((arg) => {
        if (arg.type === 'StringLiteral') {
          arg.value = expandClassString(arg.value, aliases);
        } else if (arg.type === 'LogicalExpression') {
          // condition && "ButtonMd"
          transformLogicalExpression(arg, aliases);
        } else if (arg.type === 'ConditionalExpression') {
          // condition ? "ButtonMd" : "ButtonLg"
          transformConditionalExpression(arg, aliases);
        }
      });
      break;

    case 'LogicalExpression':
      transformLogicalExpression(expr, aliases);
      break;

    case 'ConditionalExpression':
      transformConditionalExpression(expr, aliases);
      break;
  }
}

function transformLogicalExpression(expr: t.LogicalExpression, aliases: AliasMap): void {
  if (expr.right.type === 'StringLiteral') {
    expr.right.value = expandClassString(expr.right.value, aliases);
  }
  if (expr.left.type === 'StringLiteral') {
    expr.left.value = expandClassString(expr.left.value, aliases);
  }
}

function transformConditionalExpression(expr: t.ConditionalExpression, aliases: AliasMap): void {
  if (expr.consequent.type === 'StringLiteral') {
    expr.consequent.value = expandClassString(expr.consequent.value, aliases);
  }
  if (expr.alternate.type === 'StringLiteral') {
    expr.alternate.value = expandClassString(expr.alternate.value, aliases);
  }
}

/**
 * Core expansion logic for a class string
 * Handles: "Button lg:ButtonMd !ButtonMain"
 */
export function expandClassString(classString: string, aliases: AliasMap): string {
  const tokens = classString.split(/\s+/).filter(Boolean);

  const expandedTokens = tokens.map((token) => expandToken(token, aliases));

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
function expandToken(token: string, aliases: AliasMap): string {
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
    variantPrefix = workingToken.slice(0, lastColonIndex + 1); // includes the colon
    aliasName = workingToken.slice(lastColonIndex + 1);
  }

  // Check if it's a known alias (CamelCase and in map)
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(aliasName) || !aliases[aliasName]) {
    // Not an alias, return original token unchanged
    return token;
  }

  // Expand the alias
  const utilities = aliases[aliasName].split(/\s+/);

  const expanded = utilities.map((util) => {
    // Apply variant prefix with deduplication, then add important prefix
    const prefixedUtil = applyVariantPrefix(variantPrefix, util);
    return importantPrefix + prefixedUtil;
  });

  return expanded.join(' ');
}
