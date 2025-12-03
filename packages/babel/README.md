# @tailwind-expand/babel

Babel plugin for tailwind-expand. Inlines className aliases into utility classes.

## Installation

```bash
pnpm add -D @tailwind-expand/babel @tailwind-expand/vite
```

## Usage

### With Vite + React

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import tailwindExpandVite from '@tailwind-expand/vite'
import tailwindExpandBabel from '@tailwind-expand/babel'

export default defineConfig({
  plugins: [
    tailwindExpandVite(),
    tailwindcss(),
    react({
      babel: {
        plugins: [tailwindExpandBabel({
          cssPath: './src/globals.css',
          debug: process.env.NODE_ENV !== 'production',
        })],
      },
    }),
  ],
})
```

### Standalone

```js
// babel.config.js
import tailwindExpandBabel from '@tailwind-expand/babel'

module.exports = {
  plugins: [tailwindExpandBabel({
    cssPath: './src/globals.css',
    debug: process.env.NODE_ENV !== 'production',
  })],
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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cssPath` | `string` | — | Path to CSS file containing `@expand` definitions (required) |
| `mergerFn` | `(classes: string) => string` | — | Function to resolve conflicting utilities (e.g., `twMerge`) |
| `debug` | `boolean` | `false` | Add `data-expand` attribute with expanded alias names |

### With tailwind-merge

```ts
import { twMerge } from 'tailwind-merge'

tailwindExpandBabel({
  cssPath: './src/globals.css',
  mergerFn: twMerge,
  debug: process.env.NODE_ENV !== 'production',
})
```

## License

MIT
