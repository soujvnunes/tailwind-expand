# tailwind-expand

[![npm version](https://img.shields.io/npm/v/@tailwind-expand/core.svg)](https://www.npmjs.com/package/@tailwind-expand/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/soujvnunes/tailwind-expand/actions/workflows/release.yml/badge.svg)](https://github.com/soujvnunes/tailwind-expand/actions/workflows/release.yml)

**Transform CSS component aliases into Tailwind utility classes at build time.**

Define reusable component styles with familiar `@apply` syntax, then use them in JSX with full variant support.

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

// After build
<button className="text-sm inline-flex items-center h-10 px-4 lg:text-sm lg:inline-flex lg:items-center" />
```

### Benefits

- **Full transparency**: DevTools shows actual utility classes
- **Zero runtime**: All expansion happens at build time
- **Variant support**: Use `lg:`, `hover:`, `!` prefixes with any alias
- **Familiar syntax**: Define aliases using `@apply` you already know

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@tailwind-expand/vite](./packages/vite) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/vite.svg)](https://www.npmjs.com/package/@tailwind-expand/vite) | Vite plugin for Tailwind CSS v4 |
| [@tailwind-expand/postcss](./packages/postcss) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/postcss.svg)](https://www.npmjs.com/package/@tailwind-expand/postcss) | PostCSS plugin to strip @expand blocks |
| [@tailwind-expand/babel](./packages/babel) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/babel.svg)](https://www.npmjs.com/package/@tailwind-expand/babel) | Babel plugin for JSX transformation |
| [@tailwind-expand/swc](./packages/swc) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/swc.svg)](https://www.npmjs.com/package/@tailwind-expand/swc) | SWC plugin for Next.js/Turbopack |
| [@tailwind-expand/core](./packages/core) | [![npm](https://img.shields.io/npm/v/@tailwind-expand/core.svg)](https://www.npmjs.com/package/@tailwind-expand/core) | Shared utilities (internal) |

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
        plugins: [tailwindExpandBabel({ cssPath: './src/globals.css' })],
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

Create component aliases using the `@expand` at-rule with nested modifiers:

```css
/* globals.css */
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

### Use in Components

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

### Variant Support

Use Tailwind variants with any alias:

```jsx
// Responsive
<button className="Button ButtonSm lg:ButtonMd" />

// States
<button className="Button hover:ButtonPrimary" />

// Important modifier
<button className="!Button" />
```

### Alias Composition

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

### Container Patterns

Define entire page structures with deeply nested aliases. Perfect for organizing layout in your CSS:

```css
/* globals.css */
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

    &Title {
      @apply TypographyCaption text-gray-500;
    }

    &Actions {
      @apply flex items-center gap-2 pt-4 border-t border-gray-200;

      /* Deep composition: existing aliases + additional utilities */
      &Submit {
        @apply Button ButtonMd ButtonPrimary flex-1 shadow-md;
      }

      &Cancel {
        @apply Button ButtonMd ButtonSecondary opacity-80;
      }
    }
  }
}
```

```jsx
// page.tsx - Clean, semantic JSX
export default function Home() {
  return (
    <div className="Home">
      <div className="HomeHero">
        <h1 className="HomeHeroTitle">Welcome</h1>
      </div>
      <section className="HomeSection">
        <h2 className="HomeSectionTitle">Actions</h2>
        <div className="HomeSectionActions">
          <button className="HomeSectionActionsSubmit">Submit</button>
          <button className="HomeSectionActionsCancel">Cancel</button>
        </div>
      </section>
    </div>
  );
}
```

Benefits:
- **Semantic JSX**: Clean class names that describe structure
- **Centralized styling**: All layout definitions in one CSS file
- **Deep composition**: Combine existing aliases with additional utilities
- **Full DevTools visibility**: Actual utilities visible at runtime

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
