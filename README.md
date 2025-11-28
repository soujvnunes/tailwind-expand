# tailwind-expand

A Babel plugin that expands CSS component aliases into Tailwind utility classes at build time.

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
/* Input: Component.jsx */
<button className="Button ButtonMd lg:Button" />

/* Output: Component.jsx (after build) */
<button className="text-sm inline-flex items-center h-10 px-4 lg:text-sm lg:inline-flex lg:items-center" />
```

## Installation

```bash
npm install tailwind-expand
# or
pnpm add tailwind-expand
```

## Setup

This package provides three plugins:

1. **Babel plugin** - transforms JSX className attributes
2. **Vite plugin** - transforms `@expand` blocks and ensures Tailwind generates utilities (for `@tailwindcss/vite`)
3. **PostCSS plugin** - strips `@expand` blocks from CSS (for PostCSS setups)

### Vite + React (Tailwind v4)

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import tailwindExpand from 'tailwind-expand'
import tailwindExpandVite from 'tailwind-expand/vite'

export default defineConfig({
  plugins: [
    // Transform @expand blocks and inject utilities for Tailwind
    tailwindExpandVite(),
    tailwindcss(),
    react({
      babel: {
        plugins: [
          [tailwindExpand, { cssPath: './src/globals.css' }],
        ],
      },
    }),
  ],
})
```

### Next.js

```js
// next.config.js
module.exports = {
  experimental: {
    forceSwcTransforms: false, // Required to use Babel plugins
  },
}
```

```js
// babel.config.js
module.exports = {
  presets: ['next/babel'],
  plugins: [
    ['tailwind-expand', { cssPath: './src/globals.css' }],
  ],
}
```

```js
// postcss.config.js
module.exports = {
  plugins: {
    'tailwind-expand/postcss': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### PostCSS (standalone)

```js
// postcss.config.js
module.exports = {
  plugins: {
    'tailwind-expand/postcss': {},
    tailwindcss: {},
    autoprefixer: {},
  },
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

## License

MIT
