# tailwind-expand

Expand CSS component aliases into Tailwind utility classes at build time.

## Problem

Tailwind's `@apply` creates CSS classes with utility rules baked in. This means:

- DevTools shows `.Button` instead of actual utilities
- CSS bundle contains duplicate rules
- No way to compose aliases with variants like `lg:Button`

## Solution

Define component aliases in CSS, expand them to utility classes in JSX at build time.

```css
/* Input: globals.css */
@expand Button {
  @apply text-sm inline-flex items-center;

  &Md {
    @apply h-10 px-4;
  }
}
```

```jsx
/* Input */
<button className="Button ButtonMd lg:Button" />

/* Output (after build) */
<button className="text-sm inline-flex items-center h-10 px-4 lg:text-sm lg:inline-flex lg:items-center" />
```

## Packages

| Package | Description |
|---------|-------------|
| [@tailwind-expand/vite](./packages/vite) | Vite plugin for Tailwind CSS v4 |
| [@tailwind-expand/postcss](./packages/postcss) | PostCSS plugin to strip @expand blocks |
| [@tailwind-expand/babel](./packages/babel) | Babel plugin for JSX transformation |
| [@tailwind-expand/swc](./packages/swc) | SWC plugin for Next.js |
| [@tailwind-expand/core](./packages/core) | Shared utilities (internal) |

## Quick Start

### Vite + React

```bash
pnpm add -D @tailwind-expand/vite @tailwind-expand/babel
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { vite } from '@tailwind-expand/vite'
import { babel } from '@tailwind-expand/babel'

export default defineConfig({
  plugins: [
    vite(),           // Handles CSS and injects utilities for Tailwind
    tailwindcss(),
    react({
      babel: {
        plugins: [babel({ cssPath: './src/globals.css' })],
      },
    }),
  ],
})
```

### Next.js

```bash
pnpm add -D @tailwind-expand/postcss @tailwind-expand/swc
```

```ts
// next.config.ts
import { swc } from '@tailwind-expand/swc'

const nextConfig = {
  experimental: {
    swcPlugins: [swc({ cssPath: './app/globals.css' })],
  },
}

export default nextConfig
```

```js
// postcss.config.mjs
import { postcss } from '@tailwind-expand/postcss'

export default {
  plugins: {
    '@tailwindcss/postcss': {},
    ...postcss(),
  },
}
```

### Other Frameworks (PostCSS + Babel)

For frameworks using PostCSS (see [Tailwind PostCSS installation](https://tailwindcss.com/docs/installation/using-postcss)):

```bash
pnpm add -D @tailwind-expand/postcss @tailwind-expand/babel
```

```js
// postcss.config.js
module.exports = {
  plugins: {
    '@tailwind-expand/postcss': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

```js
// babel.config.js
const { babel } = require('@tailwind-expand/babel')

module.exports = {
  plugins: [babel({ cssPath: './src/globals.css' })],
}
```

## Define Aliases

**globals.css:**

```css
@expand Button {
  @apply text-sm font-medium inline-flex items-center;

  &Sm {
    @apply h-8 px-3;
  }

  &Md {
    @apply h-10 px-4;
  }

  &Primary {
    @apply bg-blue-500 text-white hover:bg-blue-600;
  }
}
```

## Use in Components

```jsx
// Input
<button className="Button ButtonMd ButtonPrimary">
  Click me
</button>

// Output (after build)
<button className="text-sm font-medium inline-flex items-center h-10 px-4 bg-blue-500 text-white hover:bg-blue-600">
  Click me
</button>
```

## With Variants

```jsx
// Responsive
<button className="Button ButtonSm lg:ButtonMd" />

// States
<button className="Button hover:ButtonPrimary" />

// Important
<button className="!Button" />
```

## Alias References

Aliases can reference other aliases:

```css
@expand Typography {
  &Caption {
    @apply text-xs font-bold uppercase;
  }
}

@expand Button {
  @apply TypographyCaption inline-flex items-center;
}
```

## Rules

1. **CamelCase required**: Alias names must be CamelCase (`Button`, `TypographyHeading`)
2. **No inheritance**: Modifiers don't inherit parent styles—compose explicitly
3. **Single entry file**: Define all aliases in one CSS file
4. **Unknown classes preserved**: Classes not matching aliases are left untouched

## Examples

- [Vite + React](./examples/vite-react)
- [Next.js](./examples/nextjs)

## License

MIT
