import { describe, it, expect } from 'vitest';
import path from 'path';
import { swc } from '../src/index';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

describe('swc plugin', () => {
  describe('plugin configuration', () => {
    it('exports a function', () => {
      expect(typeof swc).toBe('function');
    });

    it('returns a tuple with WASM path and options', () => {
      const result = swc({ cssPath: fixture('globals.css') });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('first element is the WASM path', () => {
      const [wasmPath] = swc({ cssPath: fixture('globals.css') });

      expect(typeof wasmPath).toBe('string');
      expect(wasmPath).toContain('tailwind_expand_swc.wasm');
    });

    it('second element contains aliases object', () => {
      const [, options] = swc({ cssPath: fixture('globals.css') });

      expect(options).toHaveProperty('aliases');
      expect(typeof options.aliases).toBe('object');
    });
  });

  describe('alias extraction', () => {
    it('extracts base alias', () => {
      const [, { aliases }] = swc({ cssPath: fixture('globals.css') });

      expect(aliases).toHaveProperty('Button');
      expect(aliases.Button).toContain('text-xs');
      expect(aliases.Button).toContain('inline-flex');
      expect(aliases.Button).toContain('items-center');
    });

    it('extracts nested modifiers', () => {
      const [, { aliases }] = swc({ cssPath: fixture('globals.css') });

      expect(aliases).toHaveProperty('ButtonMd');
      expect(aliases.ButtonMd).toContain('h-10');
      expect(aliases.ButtonMd).toContain('px-4');

      expect(aliases).toHaveProperty('ButtonLg');
      expect(aliases.ButtonLg).toContain('h-12');
      expect(aliases.ButtonLg).toContain('px-6');
    });

    it('extracts multiple @expand blocks', () => {
      const [, { aliases }] = swc({ cssPath: fixture('globals.css') });

      expect(aliases).toHaveProperty('Button');
      // Typography is a namespace - only TypographyCaption has utilities
      expect(aliases).toHaveProperty('TypographyCaption');
    });
  });

  describe('alias expansion', () => {
    it('expands nested utilities correctly', () => {
      const [, { aliases }] = swc({ cssPath: fixture('globals.css') });

      // TypographyCaption should have its utilities
      expect(aliases.TypographyCaption).toContain('text-xs');
      expect(aliases.TypographyCaption).toContain('font-bold');
      expect(aliases.TypographyCaption).toContain('uppercase');
    });
  });

  describe('error handling', () => {
    it('throws on missing CSS file', () => {
      expect(() => {
        swc({ cssPath: '/nonexistent/path.css' });
      }).toThrow();
    });
  });
});
