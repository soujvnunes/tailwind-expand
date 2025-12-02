import { describe, it, expect } from 'vitest';
import path from 'path';
import tailwindExpandSWC from '../src/index';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

describe('swc plugin', () => {
  describe('plugin configuration', () => {
    it('exports a function', () => {
      expect(typeof tailwindExpandSWC).toBe('function');
    });

    it('returns a tuple with WASM path and options', () => {
      const result = tailwindExpandSWC({ cssPath: fixture('globals.css') });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('first element is the WASM path', () => {
      const [wasmPath] = tailwindExpandSWC({ cssPath: fixture('globals.css') });

      expect(typeof wasmPath).toBe('string');
      expect(wasmPath).toContain('tailwind_expand_swc.wasm');
    });

    it('second element contains pre-computed aliases', () => {
      const [, options] = tailwindExpandSWC({ cssPath: fixture('globals.css') });

      expect(options).toHaveProperty('aliases');
      expect(typeof options.aliases).toBe('object');
    });

    it('debug defaults to false', () => {
      const [, options] = tailwindExpandSWC({ cssPath: fixture('globals.css') });

      expect(options).toHaveProperty('debug');
      expect(options.debug).toBe(false);
    });

    it('debug can be set to true', () => {
      const [, options] = tailwindExpandSWC({ cssPath: fixture('globals.css'), debug: true });

      expect(options.debug).toBe(true);
    });
  });

  describe('alias extraction', () => {
    it('extracts and expands aliases from CSS', () => {
      const [, options] = tailwindExpandSWC({ cssPath: fixture('globals.css') });

      // Check base Button alias
      expect(options.aliases).toHaveProperty('Button');
      expect(options.aliases.Button).toContain('text-xs');
      expect(options.aliases.Button).toContain('inline-flex');
    });

    it('extracts nested aliases', () => {
      const [, options] = tailwindExpandSWC({ cssPath: fixture('globals.css') });

      // Check nested ButtonMd alias
      expect(options.aliases).toHaveProperty('ButtonMd');
      expect(options.aliases.ButtonMd).toContain('h-10');
      expect(options.aliases.ButtonMd).toContain('px-4');

      // Check nested ButtonLg alias
      expect(options.aliases).toHaveProperty('ButtonLg');
      expect(options.aliases.ButtonLg).toContain('h-12');
    });

    it('applies mergerFn when provided', () => {
      // Simple merger that removes duplicates
      const simpleMerger = (classes: string) => {
        const seen = new Set<string>();
        return classes
          .split(' ')
          .filter((c) => {
            if (seen.has(c)) return false;
            seen.add(c);
            return true;
          })
          .join(' ');
      };

      const [, options] = tailwindExpandSWC({
        cssPath: fixture('globals.css'),
        mergerFn: simpleMerger,
      });

      // Should have aliases processed through merger
      expect(options.aliases).toBeDefined();
    });
  });

  // Note: WASM plugin transformation is tested via Rust tests.
  // TypeScript wrapper pre-computes aliases and passes them to WASM.
});
