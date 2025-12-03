import { describe, it, expect, vi } from 'vitest';
import type { ViteDevServer, HmrContext } from 'vite';
import tailwindExpandVite from '../src/index';

describe('vite plugin', () => {
  describe('plugin configuration', () => {
    it('exports a function', () => {
      expect(typeof tailwindExpandVite).toBe('function');
    });

    it('returns a plugin with correct name', () => {
      const plugin = tailwindExpandVite();
      expect(plugin.name).toBe('tailwind-expand');
    });

    it('enforces pre order to run before Tailwind', () => {
      const plugin = tailwindExpandVite();
      expect(plugin.enforce).toBe('pre');
    });
  });

  describe('file filtering', () => {
    it('ignores non-CSS files', () => {
      const plugin = tailwindExpandVite();
      expect(plugin.transform('const x = 1;', 'file.ts')).toBeNull();
      expect(plugin.transform('const x = 1;', 'file.tsx')).toBeNull();
      expect(plugin.transform('const x = 1;', 'file.js')).toBeNull();
    });

    it('ignores CSS without @expand blocks', () => {
      const plugin = tailwindExpandVite();
      const css = '.button { color: red; }';
      expect(plugin.transform(css, 'styles.css')).toBeNull();
    });

    it('processes CSS with @expand blocks', () => {
      const plugin = tailwindExpandVite();
      const css = '@expand Button { @apply text-sm; }';
      const result = plugin.transform(css, 'globals.css');
      expect(result).not.toBeNull();
    });
  });

  describe('@expand block transformation', () => {
    it('strips @expand blocks from output', () => {
      const plugin = tailwindExpandVite();
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
      const plugin = tailwindExpandVite();
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
      const plugin = tailwindExpandVite();
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
      const plugin = tailwindExpandVite();
      plugin.configResolved({ root: '/fake' });

      const css = '@expand Button { @apply text-sm inline-flex items-center; }';
      const result = plugin.transform(css, 'globals.css');

      expect(result?.code).toContain('@source inline');
      expect(result?.code).toContain('text-sm');
      expect(result?.code).toContain('inline-flex');
      expect(result?.code).toContain('items-center');
    });

    it('expands alias references in @apply', () => {
      const plugin = tailwindExpandVite();
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
      const plugin = tailwindExpandVite();
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

  describe('HMR handling', () => {
    it('returns ctx.modules when server is not configured', async () => {
      const plugin = tailwindExpandVite();
      const mockModules = [{ id: 'test' }];
      const ctx = { file: 'globals.css', modules: mockModules } as unknown as HmrContext;

      // handleHotUpdate called before configureServer
      const result = await plugin.handleHotUpdate(ctx);
      expect(result).toBe(mockModules);
    });

    it('returns ctx.modules for non-tracked CSS files', async () => {
      const plugin = tailwindExpandVite();
      plugin.configResolved({ root: '/fake' });

      const mockServer = { restart: vi.fn() } as unknown as ViteDevServer;
      plugin.configureServer(mockServer);

      const mockModules = [{ id: 'test' }];
      const ctx = { file: 'untracked.css', modules: mockModules } as unknown as HmrContext;

      const result = await plugin.handleHotUpdate(ctx);
      expect(result).toBe(mockModules);
      expect(mockServer.restart).not.toHaveBeenCalled();
    });

    it('restarts server when tracked CSS file changes', async () => {
      const plugin = tailwindExpandVite();
      plugin.configResolved({ root: '/fake' });

      const mockServer = { restart: vi.fn() } as unknown as ViteDevServer;
      plugin.configureServer(mockServer);

      // First, transform a CSS file with @expand to track it
      const css = '@expand Button { @apply text-sm; }';
      plugin.transform(css, '/path/to/globals.css');

      // Now trigger HMR for that file
      const ctx = { file: '/path/to/globals.css', modules: [{ id: 'test' }] } as unknown as HmrContext;
      const result = await plugin.handleHotUpdate(ctx);

      expect(result).toEqual([]);
      expect(mockServer.restart).toHaveBeenCalledOnce();
    });

    it('clears tracked files on server restart', async () => {
      const plugin = tailwindExpandVite();
      plugin.configResolved({ root: '/fake' });

      // Track a file
      const css = '@expand Button { @apply text-sm; }';
      plugin.transform(css, '/path/to/globals.css');

      // Configure server (simulates restart which should clear tracking)
      const mockServer = { restart: vi.fn() } as unknown as ViteDevServer;
      plugin.configureServer(mockServer);

      // File should no longer be tracked after configureServer
      const ctx = { file: '/path/to/globals.css', modules: [{ id: 'test' }] } as unknown as HmrContext;
      const result = await plugin.handleHotUpdate(ctx);

      // Since we cleared and haven't re-transformed, file won't be tracked
      expect(result).toEqual([{ id: 'test' }]);
      expect(mockServer.restart).not.toHaveBeenCalled();
    });

    it('stops tracking CSS files that no longer have @expand blocks', async () => {
      const plugin = tailwindExpandVite();
      plugin.configResolved({ root: '/fake' });

      const mockServer = { restart: vi.fn() } as unknown as ViteDevServer;
      plugin.configureServer(mockServer);

      // First transform with @expand
      const cssWithExpand = '@expand Button { @apply text-sm; }';
      plugin.transform(cssWithExpand, '/path/to/globals.css');

      // Verify it triggers restart
      let ctx = { file: '/path/to/globals.css', modules: [{ id: 'test' }] } as unknown as HmrContext;
      await plugin.handleHotUpdate(ctx);
      expect(mockServer.restart).toHaveBeenCalledOnce();

      vi.mocked(mockServer.restart).mockClear();

      // Now transform without @expand (simulates user removing @expand blocks)
      const cssWithoutExpand = '.button { color: red; }';
      plugin.transform(cssWithoutExpand, '/path/to/globals.css');

      // Should no longer trigger restart
      ctx = { file: '/path/to/globals.css', modules: [{ id: 'test' }] } as unknown as HmrContext;
      const result = await plugin.handleHotUpdate(ctx);
      expect(result).toEqual([{ id: 'test' }]);
      expect(mockServer.restart).not.toHaveBeenCalled();
    });
  });
});
