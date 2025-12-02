# @tailwind-expand/postcss

PostCSS plugin for tailwind-expand. Processes `@expand` blocks for Tailwind.

- **Development**: Generates semantic CSS classes (`.Button`, `.HomeHeroTitle`) for debugging
- **Production**: Generates `@source inline()` for Tailwind to process utilities

## Installation

For Next.js:

```bash
pnpm add -D @tailwind-expand/postcss @tailwind-expand/swc
```

For other frameworks:

```bash
pnpm add -D @tailwind-expand/postcss @tailwind-expand/babel
```

## Usage

### With Tailwind CSS v4

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwind-expand/postcss': {},
    '@tailwindcss/postcss': {},
  },
}
```

### With Tailwind CSS v3

```js
// postcss.config.js
module.exports = {
  plugins: {
    '@tailwind-expand/postcss': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## What It Does

1. **Extracts aliases** from `@expand` blocks
2. **Scans source files** for variant-prefixed aliases (e.g., `lg:Button`)
3. **Development**: Generates CSS classes (`.Button { @apply ... }`) for debugging
4. **Production**: Injects `@source inline()` for Tailwind to generate utilities

## Options

```ts
{
  // Directory to scan for source files (defaults to process.cwd())
  root: './src',
  // Optional merge function for conflicting utilities
  mergerFn: twMerge,
}
```

## License

MIT
