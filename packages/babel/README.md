# @tailwind-expand/babel

Babel plugin for tailwind-expand. Transforms JSX className attributes to expand aliases into utility classes.

## Installation

```bash
pnpm add -D @tailwind-expand/babel
```

## Usage

### With Vite + React

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { babel } from '@tailwind-expand/babel'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [[babel, { cssPath: './src/globals.css' }]],
      },
    }),
  ],
})
```

### Standalone

```js
// babel.config.js
module.exports = {
  plugins: [
    ['@tailwind-expand/babel', { cssPath: './src/globals.css' }],
  ],
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
