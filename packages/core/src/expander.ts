import type { AliasMap, ExpandOptions } from './types';

export function expand(rawAliases: AliasMap, options?: ExpandOptions): AliasMap {
  const { mergerFn } = options ?? {};
  const expanded: AliasMap = {};
  const resolving = new Set<string>(); // Circular dependency detection

  function resolve(aliasName: string): string {
    // Already fully expanded
    if (expanded[aliasName] !== undefined) {
      return expanded[aliasName];
    }

    // Not an alias, return as-is (it's a utility)
    if (rawAliases[aliasName] === undefined) {
      return aliasName;
    }

    // Circular dependency check
    if (resolving.has(aliasName)) {
      const cycle = Array.from(resolving).join(' → ') + ' → ' + aliasName;
      throw new Error(
        `[tailwind-expand] Circular dependency detected: ${cycle}`
      );
    }

    resolving.add(aliasName);

    const utilities = rawAliases[aliasName];
    const tokens = utilities.split(/\s+/);

    const resolvedTokens = tokens.map((token) => {
      // Check if token is an alias (CamelCase)
      if (/^[A-Z][a-zA-Z0-9]*$/.test(token)) {
        return resolve(token);
      }
      // It's a utility, keep as-is
      return token;
    });

    resolving.delete(aliasName);

    const result = resolvedTokens.join(' ');
    // Apply merge function if provided to resolve conflicting utilities
    expanded[aliasName] = mergerFn ? mergerFn(result) : result;

    return expanded[aliasName];
  }

  // Resolve all aliases
  for (const aliasName of Object.keys(rawAliases)) {
    resolve(aliasName);
  }

  return expanded;
}
