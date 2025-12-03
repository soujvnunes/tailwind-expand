# @tailwind-expand/vite

## 0.4.4

### Patch Changes

- c3f2cb7: fix(vite): restart server when CSS with @expand blocks changes

  Added HMR support for CSS alias changes. When a CSS file containing @expand blocks is modified, the Vite server now automatically restarts to clear all caches (including @vitejs/plugin-react's babel cache), ensuring JSX files are re-transformed with the updated alias values.

## 0.4.3

### Patch Changes

- 5bdce04: docs: align package READMEs with main documentation

## 0.4.2

### Patch Changes

- 45292f6: Add `debug` option to show expanded aliases in DevTools

  Enable `debug: true` to add a `data-expand` attribute showing which aliases were expanded:

  ```jsx
  // With debug: true
  <button data-expand="Button ButtonMd lg:Button" className="text-xs font-bold h-10 px-4 lg:text-xs lg:font-bold" />

  // With debug: false (default)
  <button className="text-xs font-bold h-10 px-4 lg:text-xs lg:font-bold" />
  ```

  This is SSR-friendly and keeps className clean while providing debugging visibility.

  ### Changes

  - **core**: Add `debug?: boolean` to `ExpandPluginOptions` type
  - **babel**: Add `data-expand` attribute when `debug: true`
  - **swc**: Add `data-expand` attribute when `debug: true`

- Updated dependencies [45292f6]
  - @tailwind-expand/core@0.4.0

## 0.4.1

### Patch Changes

- Updated dependencies [9ebe35e]
  - @tailwind-expand/core@0.3.1

## 0.4.0

### Minor Changes

- 660098f: feat: add mergerFn option to resolve utility collisions

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

### Patch Changes

- Updated dependencies [660098f]
  - @tailwind-expand/core@0.3.0

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
