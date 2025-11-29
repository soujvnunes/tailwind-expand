# @tailwind-expand/postcss

PostCSS plugin for tailwind-expand. Strips `@expand` blocks from CSS output and injects utilities for Tailwind.

## Installation

```bash
pnpm add -D @tailwind-expand/postcss @tailwind-expand/babel
```

Or for Next.js:

```bash
pnpm add -D @tailwind-expand/postcss @tailwind-expand/swc
```

## Usage

### With Tailwind CSS v4

```js
// postcss.config.mjs
import { postcss } from '@tailwind-expand/postcss'

export default {
  plugins: {
    '@tailwindcss/postcss': {},
    ...postcss(),
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

1. **Strips `@expand` blocks** from the final CSS output
2. **Scans source files** for variant-prefixed aliases (e.g., `lg:Button`)
3. **Injects `@source inline()`** directive for Tailwind CSS v4

## Options

```ts
postcss({
  // Directory to scan for source files (defaults to process.cwd())
  rootDir: './src',
})
```

## License

MIT
