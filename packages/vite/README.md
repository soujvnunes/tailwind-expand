# @tailwind-expand/vite

Vite plugin for tailwind-expand. Handles CSS transformation and injects utilities for Tailwind CSS v4.

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
import { vite } from '@tailwind-expand/vite'
import { babel } from '@tailwind-expand/babel'

export default defineConfig({
  plugins: [
    vite(),           // Must come before tailwindcss
    tailwindcss(),
    react({
      babel: {
        plugins: [babel({ cssPath: './src/globals.css' })],
      },
    }),
  ],
})
```

## What It Does

1. **Extracts aliases** from `@expand` blocks in your CSS
2. **Scans source files** for variant-prefixed aliases (e.g., `lg:Button`, `hover:ButtonPrimary`)
3. **Injects `@source inline()`** directive with collected utilities for Tailwind to generate

This ensures Tailwind CSS v4 generates the utility classes needed for responsive and state variants.

## License

MIT
