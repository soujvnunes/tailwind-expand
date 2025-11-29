import { describe, it, expect } from 'vitest';
import { vite } from '../src/index';

describe('vite plugin', () => {
  describe('plugin configuration', () => {
    it('exports a function', () => {
      expect(typeof vite).toBe('function');
    });

    it('returns a plugin with correct name', () => {
      const plugin = vite();
      expect(plugin.name).toBe('tailwind-expand');
    });

    it('enforces pre order to run before Tailwind', () => {
      const plugin = vite();
      expect(plugin.enforce).toBe('pre');
    });
  });

  describe('file filtering', () => {
    it('ignores non-CSS files', () => {
      const plugin = vite();
      expect(plugin.transform('const x = 1;', 'file.ts')).toBeNull();
      expect(plugin.transform('const x = 1;', 'file.tsx')).toBeNull();
      expect(plugin.transform('const x = 1;', 'file.js')).toBeNull();
    });

    it('ignores CSS without @expand blocks', () => {
      const plugin = vite();
      const css = '.button { color: red; }';
      expect(plugin.transform(css, 'styles.css')).toBeNull();
    });

    it('processes CSS with @expand blocks', () => {
      const plugin = vite();
      const css = '@expand Button { @apply text-sm; }';
      const result = plugin.transform(css, 'globals.css');
      expect(result).not.toBeNull();
    });
  });

  describe('@expand block transformation', () => {
    it('strips @expand blocks from output', () => {
      const plugin = vite();
      plugin.configResolved({ root: '/fake' });

      const css = `
@expand Button {
  @apply text-sm inline-flex;
}
.other { color: red; }
`;
      const result = plugin.transform(css, 'globals.css');
      expect(result?.code).not.toContain('@expand');
      expect(result?.code).toContain('.other { color: red; }');
    });

    it('strips nested @expand blocks', () => {
      const plugin = vite();
      plugin.configResolved({ root: '/fake' });

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
      const result = plugin.transform(css, 'globals.css');
      expect(result?.code).not.toContain('@expand');
      expect(result?.code).not.toContain('&Md');
      expect(result?.code).not.toContain('&Lg');
    });

    it('preserves non-expand CSS rules', () => {
      const plugin = vite();
      plugin.configResolved({ root: '/fake' });

      const css = `
.header { font-size: 2rem; }

@expand Button {
  @apply text-sm;
}

.footer { padding: 1rem; }
`;
      const result = plugin.transform(css, 'globals.css');
      expect(result?.code).toContain('.header { font-size: 2rem; }');
      expect(result?.code).toContain('.footer { padding: 1rem; }');
    });
  });

  describe('@source inline injection', () => {
    it('injects @source inline with expanded utilities', () => {
      const plugin = vite();
      plugin.configResolved({ root: '/fake' });

      const css = '@expand Button { @apply text-sm inline-flex items-center; }';
      const result = plugin.transform(css, 'globals.css');

      expect(result?.code).toContain('@source inline');
      expect(result?.code).toContain('text-sm');
      expect(result?.code).toContain('inline-flex');
      expect(result?.code).toContain('items-center');
    });

    it('expands alias references in @apply', () => {
      const plugin = vite();
      plugin.configResolved({ root: '/fake' });

      const css = `
@expand Typography {
  &Caption {
    @apply text-xs font-bold;
  }
}

@expand Button {
  @apply TypographyCaption inline-flex;
}
`;
      const result = plugin.transform(css, 'globals.css');

      // Should contain resolved utilities from TypographyCaption
      expect(result?.code).toContain('text-xs');
      expect(result?.code).toContain('font-bold');
      expect(result?.code).toContain('inline-flex');
    });
  });

  describe('multiple @expand blocks', () => {
    it('handles multiple @expand blocks', () => {
      const plugin = vite();
      plugin.configResolved({ root: '/fake' });

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
`;
      const result = plugin.transform(css, 'globals.css');

      expect(result?.code).not.toContain('@expand');
      expect(result?.code).toContain('text-sm');
      expect(result?.code).toContain('rounded-lg');
      expect(result?.code).toContain('shadow');
      expect(result?.code).toContain('border');
      expect(result?.code).toContain('px-3');
    });
  });
});
