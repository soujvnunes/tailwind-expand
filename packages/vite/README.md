# @tailwind-expand/vite

Vite plugin for tailwind-expand. Processes `@expand` blocks and generates CSS for Tailwind.

- **Development**: Generates semantic CSS classes (`.Button`, `.HomeHeroTitle`) for debugging
- **Production**: Generates `@source inline()` for Tailwind to process utilities

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

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [
    tailwindExpandVite(),  // Must come before tailwindcss
    tailwindcss(),
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

## What It Does

1. **Extracts aliases** from `@expand` blocks in your CSS
2. **Scans source files** for variant-prefixed aliases (e.g., `lg:Button`, `hover:ButtonPrimary`)
3. **Development**: Generates CSS classes (`.Button { @apply ... }`) for debugging
4. **Production**: Injects `@source inline()` for Tailwind to generate utilities

## License

MIT
