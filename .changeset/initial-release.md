---
"@tailwind-expand/core": minor
"@tailwind-expand/vite": minor
"@tailwind-expand/postcss": minor
"@tailwind-expand/babel": minor
"@tailwind-expand/swc": minor
---

Initial release of tailwind-expand

Features:
- Define CSS aliases with `@expand` blocks using familiar `@apply` syntax
- Expand aliases to utility classes at build time in JSX
- Support for variant prefixes (`lg:Button`, `hover:ButtonPrimary`)
- Support for important modifier (`!Button`)
- Alias composition (aliases can reference other aliases)

Packages:
- `@tailwind-expand/core` - Shared extraction and expansion utilities
- `@tailwind-expand/vite` - Vite plugin for Tailwind CSS v4
- `@tailwind-expand/postcss` - PostCSS plugin to strip @expand blocks
- `@tailwind-expand/babel` - Babel plugin for JSX transformation
- `@tailwind-expand/swc` - SWC/WASM plugin for Next.js and Turbopack
