import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import postcssPlugin from '../src/index';

describe('postcss plugin', () => {
  const process = async (css: string) => {
    const result = await postcss([postcssPlugin({ root: __dirname })]).process(css, {
      from: undefined,
    });
    return result.css;
  };

  describe('plugin configuration', () => {
    it('exports a postcss plugin', () => {
      expect(postcssPlugin.postcss).toBe(true);
    });

    it('has correct plugin name', () => {
      const plugin = postcssPlugin() as { postcssPlugin: string };
      expect(plugin.postcssPlugin).toBe('tailwind-expand');
    });
  });

  describe('file filtering', () => {
    it('ignores CSS without @expand blocks', async () => {
      const css = '.button { color: red; }';
      const result = await process(css);
      expect(result).toBe('.button { color: red; }');
    });

    it('processes CSS with @expand blocks', async () => {
      const css = '@expand Button { @apply text-sm; }';
      const result = await process(css);
      expect(result).not.toContain('@expand');
    });
  });

  describe('@expand block removal', () => {
    it('removes @expand blocks from output', async () => {
      const css = `
@expand Button {
  @apply text-sm inline-flex;
}
.other { color: red; }
`;
      const result = await process(css);
      expect(result).not.toContain('@expand');
      expect(result).toContain('.other { color: red; }');
    });

    it('removes nested @expand blocks', async () => {
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
      const result = await process(css);
      expect(result).not.toContain('@expand');
      expect(result).not.toContain('@apply');
    });

    it('preserves non-expand CSS rules', async () => {
      const css = `
.header { font-size: 2rem; }

@expand Button {
  @apply text-sm;
}

.footer { padding: 1rem; }
`;
      const result = await process(css);
      expect(result).toContain('.header { font-size: 2rem; }');
      expect(result).toContain('.footer { padding: 1rem; }');
    });
  });

  describe('development mode (CSS classes)', () => {
    it('generates CSS classes with @apply in dev mode', async () => {
      const css = `
@expand Button { @apply text-sm inline-flex items-center; }
.keep { color: red; }
`;
      const result = await process(css);

      // In dev mode, generates CSS classes for HMR
      expect(result).toContain('.Button { @apply text-sm inline-flex items-center; }');
      expect(result).toContain('.keep { color: red; }');
    });

    it('generates nested CSS classes in dev mode', async () => {
      const css = `
@expand Button {
  @apply text-sm;

  &Md {
    @apply h-10 px-4;
  }
}
.keep { color: red; }
`;
      const result = await process(css);

      expect(result).toContain('.Button { @apply text-sm; }');
      expect(result).toContain('.ButtonMd { @apply h-10 px-4; }');
    });
  });

  describe('production mode (@source inline)', () => {
    const processInProd = async (css: string) => {
      const originalEnv = globalThis.process.env.NODE_ENV;
      globalThis.process.env.NODE_ENV = 'production';
      try {
        const result = await postcss([postcssPlugin({ root: __dirname })]).process(css, {
          from: undefined,
        });
        return result.css;
      } finally {
        globalThis.process.env.NODE_ENV = originalEnv;
      }
    };

    it('injects @source inline with expanded utilities', async () => {
      const css = `
@expand Button { @apply text-sm inline-flex items-center; }
.keep { color: red; }
`;
      const result = await processInProd(css);

      expect(result).toContain('@source inline');
      expect(result).toContain('text-sm');
      expect(result).toContain('inline-flex');
      expect(result).toContain('items-center');
    });

    it('includes utilities from nested modifiers', async () => {
      const css = `
@expand Button {
  @apply text-sm;

  &Md {
    @apply h-10 px-4;
  }
}
.keep { color: red; }
`;
      const result = await processInProd(css);

      expect(result).toContain('@source inline');
      expect(result).toContain('text-sm');
      expect(result).toContain('h-10');
      expect(result).toContain('px-4');
    });
  });

  describe('alias expansion', () => {
    it('expands alias references in @apply', async () => {
      const css = `
@expand Typography {
  &Caption {
    @apply text-xs font-bold;
  }
}

@expand Button {
  @apply TypographyCaption inline-flex;
}
.keep { color: red; }
`;
      const result = await process(css);

      // Should contain resolved utilities from TypographyCaption
      expect(result).toContain('text-xs');
      expect(result).toContain('font-bold');
      expect(result).toContain('inline-flex');
    });
  });

  describe('multiple @expand blocks', () => {
    it('handles multiple @expand blocks', async () => {
      const css = `
@expand Button {
  @apply text-sm;
}

@expand Card {
  @apply rounded-lg shadow;
}

@expand Input {
  @apply border px-3;
}
.keep { color: red; }
`;
      const result = await process(css);

      expect(result).not.toContain('@expand');
      expect(result).toContain('text-sm');
      expect(result).toContain('rounded-lg');
      expect(result).toContain('shadow');
      expect(result).toContain('border');
      expect(result).toContain('px-3');
    });
  });

  describe('independent processing', () => {
    it('processes each CSS input independently', async () => {
      // First CSS version with text-gray-600
      const cssV1 = `
@expand Card {
  @apply rounded-lg text-gray-600;
}
.keep { color: red; }
`;
      // Second CSS version with text-emerald-600
      const cssV2 = `
@expand Card {
  @apply rounded-lg text-emerald-600;
}
.keep { color: red; }
`;

      const resultV1 = await process(cssV1);
      expect(resultV1).toContain('text-gray-600');
      expect(resultV1).not.toContain('text-emerald-600');

      const resultV2 = await process(cssV2);
      expect(resultV2).toContain('text-emerald-600');
      // V2 should NOT contain V1's utilities (no accumulation)
      expect(resultV2).not.toContain('text-gray-600');
    });

    it('processes nested changes independently', async () => {
      const cssV1 = `
@expand Card {
  @apply rounded-lg;

  &Body {
    @apply text-gray-600;
  }
}
.keep { color: red; }
`;
      const cssV2 = `
@expand Card {
  @apply rounded-lg;

  &Body {
    @apply text-emerald-600;
  }
}
.keep { color: red; }
`;

      const resultV1 = await process(cssV1);
      expect(resultV1).toContain('text-gray-600');

      const resultV2 = await process(cssV2);
      expect(resultV2).toContain('text-emerald-600');
      expect(resultV2).not.toContain('text-gray-600');
    });
  });
});
