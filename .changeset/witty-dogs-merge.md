---
"@tailwind-expand/core": minor
"@tailwind-expand/babel": minor
"@tailwind-expand/swc": minor
"@tailwind-expand/postcss": minor
"@tailwind-expand/vite": minor
---

feat: add mergerFn option to resolve utility collisions

Added optional `mergerFn` option to all plugins for resolving conflicting Tailwind utilities during alias expansion. This allows users to pass a merge function (typically `twMerge` from tailwind-merge) to handle cases where composed aliases contain conflicting utilities like `text-xs` and `text-sm`.

Example usage:
```ts
import { twMerge } from 'tailwind-merge'

// Vite
tailwindExpandVite({ mergerFn: twMerge })

// Babel
tailwindExpandBabel({ cssPath: './src/globals.css', mergerFn: twMerge })

// PostCSS
'@tailwind-expand/postcss': { mergerFn: twMerge }

// SWC
tailwindExpandSWC({ cssPath: './app/globals.css', mergerFn: twMerge })
```
