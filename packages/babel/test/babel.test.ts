import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import { babel } from '../src/index';
import path from 'path';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

const transform = (code: string) =>
  transformSync(code, {
    plugins: [[babel, { cssPath: fixture('globals.css') }]],
    presets: ['@babel/preset-react'],
  })?.code;

describe('babel plugin', () => {
  it('expands static className string', () => {
    const input = `<div className="Button ButtonMd" />`;
    const output = transform(input);

    expect(output).toContain('text-xs');
    expect(output).toContain('inline-flex');
    expect(output).toContain('h-10');
    expect(output).not.toContain('"Button ');
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
});
