import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import tailwindExpandBabel from '../src/index';
import path from 'path';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

const transform = (code: string, debug = false) =>
  transformSync(code, {
    plugins: [tailwindExpandBabel({ cssPath: fixture('globals.css'), debug })],
    presets: ['@babel/preset-react'],
  })?.code;

describe('babel plugin', () => {
  describe('default mode (debug: false)', () => {
    it('expands static className string', () => {
      const input = `<div className="Button ButtonMd" />`;
      const output = transform(input);

      expect(output).toContain('text-xs');
      expect(output).toContain('inline-flex');
      expect(output).toContain('h-10');
      expect(output).not.toContain('"Button ');
      expect(output).not.toContain('data-expand');
    });

    it('expands with variant prefix', () => {
      const input = `<div className="lg:Button" />`;
      const output = transform(input);

      expect(output).toContain('lg:text-xs');
      expect(output).toContain('lg:inline-flex');
    });

    it('expands with stacked variants', () => {
      const input = `<div className="lg:hover:Button" />`;
      const output = transform(input);

      expect(output).toContain('lg:hover:text-xs');
    });

    it('expands important modifier', () => {
      const input = `<div className="!Button" />`;
      const output = transform(input);

      expect(output).toContain('!text-xs');
      expect(output).toContain('!inline-flex');
    });

    it('stacks variant onto alias with existing variants', () => {
      // ButtonGitHub has "dark:text-white"
      const input = `<div className="lg:ButtonGitHub" />`;
      const output = transform(input);

      expect(output).toContain('lg:dark:text-white');
    });

    it('leaves unknown classes untouched', () => {
      const input = `<div className="Button unknown-class px-4" />`;
      const output = transform(input);

      expect(output).toContain('unknown-class');
      expect(output).toContain('px-4');
    });

    it('expands in template literal static parts', () => {
      const input = `<div className={\`Button \${variant} ButtonMd\`} />`;
      const output = transform(input);

      expect(output).toContain('text-xs');
      expect(output).toContain('${variant}');
    });

    it('expands string literals in cn() calls', () => {
      const input = `<div className={cn("Button", isActive && "ButtonMain")} />`;
      const output = transform(input);

      expect(output).toContain('text-xs');
      expect(output).toContain('bg-amber-500');
    });

    it('expands ternary expression strings', () => {
      const input = `<div className={active ? "ButtonMain" : "ButtonGitHub"} />`;
      const output = transform(input);

      expect(output).toContain('bg-amber-500');
      expect(output).not.toContain('"ButtonMain"');
    });

    it('leaves negative prefix untouched', () => {
      const input = `<div className="-Button" />`;
      const output = transform(input);

      expect(output).toContain('-Button');
    });

    it('processes class and classes attributes', () => {
      const input = `<><div class="Button" /><div classes="ButtonMd" /></>`;
      const output = transform(input);

      expect(output).toContain('text-xs');
      expect(output).toContain('h-10');
    });

    describe('variant prefix deduplication', () => {
      it('deduplicates same variant prefix (hover:hover: -> hover:)', () => {
        // ButtonMain has "hover:bg-amber-600"
        const input = `<div className="hover:ButtonMain" />`;
        const output = transform(input);

        expect(output).toContain('hover:bg-amber-500');
        expect(output).toContain('hover:bg-amber-600');
        expect(output).not.toContain('hover:hover:bg-amber-600');
      });

      it('deduplicates dark: prefix when utility already has dark:', () => {
        // ButtonGitHub has "dark:text-white"
        const input = `<div className="dark:ButtonGitHub" />`;
        const output = transform(input);

        expect(output).toContain('dark:text-white');
        expect(output).not.toContain('dark:dark:text-white');
      });

      it('deduplicates with chained variants (dark:hover: + hover:)', () => {
        // ButtonMain has "hover:bg-amber-600"
        const input = `<div className="dark:hover:ButtonMain" />`;
        const output = transform(input);

        expect(output).toContain('dark:hover:bg-amber-600');
        expect(output).not.toContain('dark:hover:hover:bg-amber-600');
      });

      it('stacks different variants correctly', () => {
        // ButtonMain has "hover:bg-amber-600"
        const input = `<div className="dark:ButtonMain" />`;
        const output = transform(input);

        expect(output).toContain('dark:hover:bg-amber-600');
      });
    });
  });

  describe('debug mode (debug: true)', () => {
    it('adds data-expand attribute with alias names', () => {
      const input = `<div className="Button ButtonMd" />`;
      const output = transform(input, true);

      // Should have data-expand with alias names
      expect(output).toContain('data-expand');
      expect(output).toMatch(/data-expand.*Button/);
      expect(output).toMatch(/data-expand.*ButtonMd/);
      // className should only contain utilities (not alias names)
      expect(output).toContain('text-xs');
      expect(output).toContain('inline-flex');
      expect(output).toContain('h-10');
    });

    it('adds data-expand with variant-prefixed aliases', () => {
      const input = `<div className="lg:Button" />`;
      const output = transform(input, true);

      // data-expand should have full token including variant prefix
      expect(output).toContain('data-expand');
      expect(output).toMatch(/data-expand.*lg:Button/);
      // className should have variant-prefixed utilities
      expect(output).toContain('lg:text-xs');
      expect(output).toContain('lg:inline-flex');
    });

    it('does not add data-expand when no aliases expanded', () => {
      const input = `<div className="text-red-500 px-4" />`;
      const output = transform(input, true);

      expect(output).not.toContain('data-expand');
    });

    it('adds data-expand in template literals', () => {
      const input = `<div className={\`Button \${variant}\`} />`;
      const output = transform(input, true);

      expect(output).toContain('data-expand');
      expect(output).toMatch(/data-expand.*Button/);
    });

    it('adds data-expand in cn() calls', () => {
      const input = `<div className={cn("Button", isActive && "ButtonMain")} />`;
      const output = transform(input, true);

      expect(output).toContain('data-expand');
      expect(output).toMatch(/data-expand.*Button/);
      expect(output).toMatch(/data-expand.*ButtonMain/);
    });

    it('adds data-expand in ternary expressions', () => {
      const input = `<div className={active ? "ButtonMain" : "ButtonGitHub"} />`;
      const output = transform(input, true);

      expect(output).toContain('data-expand');
      expect(output).toMatch(/data-expand.*ButtonMain/);
      expect(output).toMatch(/data-expand.*ButtonGitHub/);
    });
  });
});
