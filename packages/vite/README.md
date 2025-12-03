# @tailwind-expand/vite

Vite plugin for tailwind-expand. Processes `@expand` blocks and generates CSS for Tailwind.

## Installation

```bash
pnpm add -D @tailwind-expand/vite @tailwind-expand/babel
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import tailwindExpandVite from '@tailwind-expand/vite'
import tailwindExpandBabel from '@tailwind-expand/babel'

export default defineConfig({
  plugins: [
    tailwindExpandVite(),  // Must come before tailwindcss
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

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mergerFn` | `(classes: string) => string` | — | Function to resolve conflicting utilities (e.g., `twMerge`) |

### With tailwind-merge

```ts
import { twMerge } from 'tailwind-merge'

tailwindExpandVite({ mergerFn: twMerge })
```

## What It Does

1. **Extracts aliases** from `@expand` blocks in your CSS
2. **Scans source files** for variant-prefixed aliases (e.g., `lg:Button`, `hover:ButtonPrimary`)
3. **Injects `@source inline()`** for Tailwind to generate utilities

## License

MIT
