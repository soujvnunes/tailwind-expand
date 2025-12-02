# tailwind-expand

A namespace for build-time Tailwind CSS expansion plugins. Transform CSS component aliases into utility classes in your JSX.

| Package | Details |
|---------|---------|
| [@tailwind-expand/vite](./packages/vite) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/vite.svg)](https://www.npmjs.com/package/@tailwind-expand/vite) Vite plugin for Tailwind CSS v4 |
| [@tailwind-expand/postcss](./packages/postcss) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/postcss.svg)](https://www.npmjs.com/package/@tailwind-expand/postcss) PostCSS plugin to strip @expand blocks |
| [@tailwind-expand/babel](./packages/babel) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/babel.svg)](https://www.npmjs.com/package/@tailwind-expand/babel) Babel plugin for JSX transformation |
| [@tailwind-expand/swc](./packages/swc) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/swc.svg)](https://www.npmjs.com/package/@tailwind-expand/swc) SWC plugin for Next.js/Turbopack |
| [@tailwind-expand/core](./packages/core) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/core.svg)](https://www.npmjs.com/package/@tailwind-expand/core) Shared utilities (internal) |

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![CI](https://github.com/soujvnunes/tailwind-expand/actions/workflows/release.yml/badge.svg)](https://github.com/soujvnunes/tailwind-expand/actions/workflows/release.yml)

## The Problem

Tailwind's `@apply` creates CSS classes with utility rules baked in:

```css
/* Using @apply */
.Button {
  @apply text-sm inline-flex items-center;
}
```

This approach has limitations:

- **DevTools opacity**: Browser shows `.Button` instead of actual utilities
- **Bundle bloat**: CSS contains duplicate rules across components
- **No variant composition**: Can't use `lg:Button` or `hover:Button`

## The Solution

**tailwind-expand** lets you define component aliases in CSS and expands them to utility classes in your JSX at build time:

```css
/* globals.css */
@expand Button {
  @apply text-sm inline-flex items-center;

  &Md {
    @apply h-10 px-4;
  }
}
```

```jsx
// Your component
<button className="Button ButtonMd lg:Button" />

// After build (debug: true)
<button data-expand="Button ButtonMd lg:Button" className="text-sm inline-flex items-center h-10 px-4 lg:text-sm lg:inline-flex lg:items-center" />
```

> With `debug: false` (default), `data-expand` is omitted.

### Benefits

- **Atomic CSS in production**: Inlined utilities = smaller bundles, deduplicated classes
- **Semantic classes in development**: `.Button`, `.HomeHeroTitle` in DevTools for easy debugging
- **Zero runtime**: All expansion happens at build time
- **Variant support**: Use `lg:`, `hover:`, `!` prefixes with any alias
- **Familiar syntax**: Define aliases using `@apply` you already know

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

### Next.js

```bash
pnpm add -D @tailwind-expand/postcss @tailwind-expand/swc
```

```ts
// next.config.ts
import tailwindExpandSWC from '@tailwind-expand/swc'

const nextConfig = {
  experimental: {
    swcPlugins: [tailwindExpandSWC({ cssPath: './app/globals.css' })],
  },
}

export default nextConfig
```

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwind-expand/postcss': {},
    '@tailwindcss/postcss': {},
  },
}
```

### Other Frameworks

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
import tailwindExpandBabel from '@tailwind-expand/babel'

module.exports = {
  plugins: [tailwindExpandBabel({ cssPath: './src/globals.css' })],
}
```

## Usage

### Define Aliases

Create component aliases using the `@expand` at-rule with nested modifiers. Aliases can reference other aliases for composition:

```css
/* globals.css */
@import "tailwindcss";

@theme inline {
  --color-primary: #3b82f6;
  --color-danger: #ef4444;
}

@expand Typography {
  &Caption {
    @apply text-xs font-bold uppercase;
  }
  &Heading {
    @apply text-2xl font-bold;
  }
}

@expand Button {
  /* Compose with other aliases */
  @apply TypographyCaption inline-flex items-center;

  &Sm {
    @apply h-8 px-3;
  }
  &Md {
    @apply h-10 px-4;
  }
  &Primary {
    @apply bg-primary text-white hover:bg-primary/90;
  }
}

/* Container pattern: define entire page structures */
@expand Home {
  @apply min-h-screen bg-gray-50 p-8;

  &Hero {
    @apply mx-auto max-w-2xl space-y-8;

    &Title {
      @apply TypographyHeading text-gray-900;
    }
  }

  &Section {
    @apply space-y-4;

    &Actions {
      @apply flex items-center gap-2;

      &Submit {
        @apply Button ButtonMd ButtonPrimary flex-1;
      }
    }
  }
}
```

### Use in Components

```jsx
// Input
<div className="Home">
  <div className="HomeHero">
    <h1 className="HomeHeroTitle">Welcome</h1>
  </div>
  <section className="HomeSection">
    <div className="HomeSectionActions">
      <button className="HomeSectionActionsSubmit">Submit</button>
      <button className="Button ButtonMd ButtonPrimary">Click me</button>
    </div>
  </section>
</div>

// Output (after build)
<div className="min-h-screen bg-gray-50 p-8">
  <div className="mx-auto max-w-2xl space-y-8">
    <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
  </div>
  <section className="space-y-4">
    <div className="flex items-center gap-2">
      <button className="text-xs font-bold uppercase inline-flex items-center h-10 px-4 bg-primary text-white hover:bg-primary/90 flex-1">Submit</button>
      <button className="text-xs font-bold uppercase inline-flex items-center h-10 px-4 bg-primary text-white hover:bg-primary/90">Click me</button>
    </div>
  </section>
</div>
```

### State Support

Use Tailwind states with any alias. Each utility in the alias gets the state prefix:

```jsx
// Input
<button className="Button ButtonSm lg:ButtonMd hover:ButtonPrimary !ButtonMd" />

// Output (debug: true)
<button data-expand="Button ButtonSm lg:ButtonMd hover:ButtonPrimary !ButtonMd" className="text-xs font-bold uppercase inline-flex items-center h-8 px-3 lg:h-10 lg:px-4 hover:bg-primary hover:text-white hover:bg-primary/90 !h-10 !px-4" />
```

### Handling Utility Collisions

When composing aliases, you may end up with conflicting utilities (e.g., `text-xs` from one alias and `text-sm` added later). Use `mergerFn` to resolve these conflicts with [tailwind-merge](https://github.com/dcastil/tailwind-merge):

```bash
pnpm add tailwind-merge
```

**Vite + React:**

```ts
// vite.config.ts
import { twMerge } from 'tailwind-merge'

export default defineConfig({
  plugins: [
    tailwindExpandVite({ mergerFn: twMerge }),
    tailwindcss(),
    react({
      babel: {
        plugins: [tailwindExpandBabel({ cssPath: './src/globals.css', mergerFn: twMerge })],
      },
    }),
  ],
})
```

**Next.js:**

```ts
// next.config.ts
import { twMerge } from 'tailwind-merge'

swcPlugins: [tailwindExpandSWC({ cssPath: './app/globals.css', mergerFn: twMerge })]
```

```js
// postcss.config.mjs
import { twMerge } from 'tailwind-merge'

export default {
  plugins: {
    '@tailwind-expand/postcss': { mergerFn: twMerge },
    '@tailwindcss/postcss': {},
  },
}
```

**Example:**

```css
@expand Button {
  @apply TypographyCaption; /* includes text-xs */
}

@expand Form {
  &Submit {
    @apply Button text-sm; /* text-xs + text-sm conflict */
  }
}
```

```jsx
// Without mergerFn
<button className="text-xs font-bold uppercase inline-flex items-center text-sm" />

// With mergerFn: twMerge
<button className="font-bold uppercase inline-flex items-center text-sm" />
```

## Plugin Options

All plugins accept these options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cssPath` | `string` | — | Path to CSS file containing `@expand` definitions |
| `mergerFn` | `(classes: string) => string` | — | Function to resolve conflicting utilities (e.g., `twMerge`) |
| `debug` | `boolean` | `false` | Add `data-expand` attribute with expanded alias names |

## Rules

1. **CamelCase required**: Alias names must be CamelCase (`Button`, `TypographyHeading`)
2. **No inheritance**: Modifiers don't inherit parent styles—compose explicitly
3. **Single entry file**: Define all aliases in one CSS file
4. **Unknown classes preserved**: Classes not matching aliases are left untouched

## Examples

- [Vite + React](./examples/vite-react)
- [Next.js](./examples/nextjs)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

MIT © [Victor Nunes](https://github.com/soujvnunes)
