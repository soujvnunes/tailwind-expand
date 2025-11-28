import { describe, it, expect } from 'vitest';
import {
  extractAliases,
  expandAliases,
  collectVariantAliases,
  transformExpandBlocks,
  AliasMap,
} from '../src/vite';

describe('extractAliases', () => {
  it('extracts simple alias from @expand block', () => {
    const css = `
      @expand Button {
        @apply text-sm font-bold;
      }
    `;
    const aliases = extractAliases(css);
    expect(aliases).toEqual({
      Button: 'text-sm font-bold',
    });
  });

  it('extracts nested modifiers from @expand block', () => {
    const css = `
      @expand Button {
        @apply text-sm;

        &Md {
          @apply h-10 px-4;
        }

        &Lg {
          @apply h-12 px-6;
        }
      }
    `;
    const aliases = extractAliases(css);
    expect(aliases).toEqual({
      Button: 'text-sm',
      ButtonMd: 'h-10 px-4',
      ButtonLg: 'h-12 px-6',
    });
  });

  it('extracts multiple @expand blocks', () => {
    const css = `
      @expand Typography {
        &Caption {
          @apply text-xs font-bold;
        }
      }

      @expand Button {
        @apply inline-flex;
      }
    `;
    const aliases = extractAliases(css);
    expect(aliases).toEqual({
      TypographyCaption: 'text-xs font-bold',
      Button: 'inline-flex',
    });
  });
});

describe('expandAliases', () => {
  it('expands alias references', () => {
    const aliases: AliasMap = {
      TypographyCaption: 'text-xs font-bold',
      Button: 'TypographyCaption inline-flex',
    };
    const expanded = expandAliases(aliases);
    expect(expanded.Button).toBe('text-xs font-bold inline-flex');
  });

  it('handles deeply nested references', () => {
    const aliases: AliasMap = {
      Base: 'text-sm',
      Typography: 'Base font-bold',
      Button: 'Typography inline-flex',
    };
    const expanded = expandAliases(aliases);
    expect(expanded.Button).toBe('text-sm font-bold inline-flex');
  });

  it('handles circular references gracefully', () => {
    const aliases: AliasMap = {
      A: 'B text-sm',
      B: 'A font-bold',
    };
    const expanded = expandAliases(aliases);
    // Should not throw, and should handle circular refs
    expect(expanded.A).toBeDefined();
    expect(expanded.B).toBeDefined();
  });
});

describe('collectVariantAliases', () => {
  it('collects lg: variant prefixed aliases', () => {
    const code = `<button className="Button lg:ButtonMd" />`;
    const aliases: AliasMap = {
      Button: 'text-sm',
      ButtonMd: 'h-10 px-4',
    };
    const variantUtilities = new Set<string>();

    collectVariantAliases(code, aliases, variantUtilities);

    expect(variantUtilities.has('lg:h-10')).toBe(true);
    expect(variantUtilities.has('lg:px-4')).toBe(true);
  });

  it('collects multiple variant prefixes', () => {
    const code = `<button className="Button sm:ButtonSm lg:ButtonMd xl:ButtonLg" />`;
    const aliases: AliasMap = {
      Button: 'text-sm',
      ButtonSm: 'h-8 px-3',
      ButtonMd: 'h-10 px-4',
      ButtonLg: 'h-12 px-6',
    };
    const variantUtilities = new Set<string>();

    collectVariantAliases(code, aliases, variantUtilities);

    expect(variantUtilities.has('sm:h-8')).toBe(true);
    expect(variantUtilities.has('sm:px-3')).toBe(true);
    expect(variantUtilities.has('lg:h-10')).toBe(true);
    expect(variantUtilities.has('lg:px-4')).toBe(true);
    expect(variantUtilities.has('xl:h-12')).toBe(true);
    expect(variantUtilities.has('xl:px-6')).toBe(true);
  });

  it('handles hover: variant prefix', () => {
    const code = `<button className="Button hover:ButtonPrimary" />`;
    const aliases: AliasMap = {
      Button: 'text-sm',
      ButtonPrimary: 'bg-blue-500 text-white',
    };
    const variantUtilities = new Set<string>();

    collectVariantAliases(code, aliases, variantUtilities);

    expect(variantUtilities.has('hover:bg-blue-500')).toBe(true);
    expect(variantUtilities.has('hover:text-white')).toBe(true);
  });

  it('handles important modifier with variant', () => {
    const code = `<button className="lg:!ButtonMd" />`;
    const aliases: AliasMap = {
      ButtonMd: 'h-10 px-4',
    };
    const variantUtilities = new Set<string>();

    collectVariantAliases(code, aliases, variantUtilities);

    expect(variantUtilities.has('lg:h-10')).toBe(true);
    expect(variantUtilities.has('lg:px-4')).toBe(true);
  });

  it('ignores unknown aliases', () => {
    const code = `<button className="lg:UnknownAlias" />`;
    const aliases: AliasMap = {
      Button: 'text-sm',
    };
    const variantUtilities = new Set<string>();

    collectVariantAliases(code, aliases, variantUtilities);

    expect(variantUtilities.size).toBe(0);
  });
});

describe('transformExpandBlocks', () => {
  it('removes @expand blocks from CSS', () => {
    const css = `
@import "tailwindcss";

@expand Button {
  @apply text-sm;
}

.other-class { color: red; }
    `;
    const expanded: AliasMap = { Button: 'text-sm' };
    const variantUtilities = new Set<string>();

    const result = transformExpandBlocks(css, expanded, variantUtilities);

    expect(result).not.toContain('@expand');
    expect(result).toContain('@import "tailwindcss"');
    expect(result).toContain('.other-class { color: red; }');
  });

  it('adds @source inline with all utilities', () => {
    const css = `
@expand Button {
  @apply text-sm font-bold;
}
    `;
    const expanded: AliasMap = { Button: 'text-sm font-bold' };
    const variantUtilities = new Set<string>();

    const result = transformExpandBlocks(css, expanded, variantUtilities);

    expect(result).toContain('@source inline(');
    expect(result).toContain('text-sm');
    expect(result).toContain('font-bold');
  });

  it('includes variant-prefixed utilities in @source', () => {
    const css = `
@expand Button {
  @apply text-sm;

  &Md {
    @apply h-10 px-4;
  }
}
    `;
    const expanded: AliasMap = {
      Button: 'text-sm',
      ButtonMd: 'h-10 px-4',
    };
    const variantUtilities = new Set<string>(['lg:h-10', 'lg:px-4']);

    const result = transformExpandBlocks(css, expanded, variantUtilities);

    expect(result).toContain('lg:h-10');
    expect(result).toContain('lg:px-4');
  });

  it('handles complex CSS with multiple @expand blocks', () => {
    const css = `
@import "tailwindcss";

@expand Typography {
  &Caption {
    @apply text-xs font-bold;
  }
}

.custom { margin: 1rem; }

@expand Button {
  @apply inline-flex;
}

.another { padding: 2rem; }
    `;
    const expanded: AliasMap = {
      TypographyCaption: 'text-xs font-bold',
      Button: 'inline-flex',
    };
    const variantUtilities = new Set<string>();

    const result = transformExpandBlocks(css, expanded, variantUtilities);

    expect(result).not.toContain('@expand');
    expect(result).toContain('@import "tailwindcss"');
    expect(result).toContain('.custom { margin: 1rem; }');
    expect(result).toContain('.another { padding: 2rem; }');
    expect(result).toContain('@source inline(');
    expect(result).toContain('text-xs');
    expect(result).toContain('font-bold');
    expect(result).toContain('inline-flex');
  });
});
