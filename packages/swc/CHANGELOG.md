# @tailwind-expand/swc

## 0.3.0

### Minor Changes

- 29c7f07: BREAKING: Change plugins from named exports to default exports

  Migration:

  ```js
  // Before
  import { vite } from "@tailwind-expand/vite";
  import { swc } from "@tailwind-expand/swc";
  import { babel } from "@tailwind-expand/babel";

  // After
  import tailwindExpandVite from "@tailwind-expand/vite";
  import tailwindExpandSWC from "@tailwind-expand/swc";
  import tailwindExpandBabel from "@tailwind-expand/babel";
  ```

## 0.2.0

### Minor Changes

- 4658354: Initial release of tailwind-expand

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

### Patch Changes

- Updated dependencies [4658354]
  - @tailwind-expand/core@0.2.0
