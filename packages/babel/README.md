# @tailwind-expand/babel

Babel plugin for tailwind-expand. Inlines className aliases into utility classes.

**Use in production only** for atomic CSS benefits (smaller bundles). In development, the Vite/PostCSS plugin generates semantic CSS classes (`.Button`, `.HomeHeroTitle`) for easier debugging.

## Installation

```bash
pnpm add -D @tailwind-expand/babel @tailwind-expand/vite
```

## Usage

### With Vite + React

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindExpandVite from '@tailwind-expand/vite'
import tailwindExpandBabel from '@tailwind-expand/babel'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [
    tailwindExpandVite(),
    react({
      babel: {
        // Production: inline utilities for atomic CSS
        // Development: semantic .Button classes for debugging
        plugins: isProd
          ? [tailwindExpandBabel({ cssPath: './src/globals.css' })]
          : [],
      },
    }),
  ],
})
```

### Standalone

```js
// babel.config.js
import tailwindExpandBabel from '@tailwind-expand/babel'

const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  plugins: isProd
    ? [tailwindExpandBabel({ cssPath: './src/globals.css' })]
    : [],
}
```

## What It Does

Transforms JSX at build time:

```jsx
// Input
<button className="Button ButtonMd lg:Button" />

// Output
<button className="text-sm inline-flex h-10 px-4 lg:text-sm lg:inline-flex" />
```

Supports:
- Static className strings
- Template literals
- Ternary expressions
- `cn()` / `clsx()` calls
- Variant prefixes (`lg:`, `hover:`, etc.)
- Important modifier (`!Button`)

## Options

```ts
babel({
  // Path to CSS file containing @expand blocks (required)
  cssPath: './src/globals.css',
})
```

## License

MIT
