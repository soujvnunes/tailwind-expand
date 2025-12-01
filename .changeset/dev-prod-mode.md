---
"@tailwind-expand/core": minor
"@tailwind-expand/postcss": minor
"@tailwind-expand/vite": minor
"@tailwind-expand/swc": minor
"@tailwind-expand/babel": minor
---

Add dev/prod mode for better debugging experience

**Development mode**: CSS plugins (PostCSS/Vite) generate semantic CSS classes (`.Button`, `.HomeHeroTitle`) that appear in DevTools, making debugging easier with full HMR support.

**Production mode**: SWC/Babel plugins inline aliases into atomic utility classes for smaller bundles and deduplicated CSS.

### Usage

Configure SWC/Babel to run only in production:

```ts
// next.config.ts
const isProd = process.env.NODE_ENV === 'production'

swcPlugins: isProd
  ? [tailwindExpandSWC({ cssPath: './app/globals.css' })]
  : []
```

```ts
// vite.config.ts
const isProd = process.env.NODE_ENV === 'production'

react({
  babel: {
    plugins: isProd
      ? [tailwindExpandBabel({ cssPath: './src/globals.css' })]
      : [],
  },
})
```

### Changes

- **core**: Add `generateCssClasses()` utility for dev mode
- **postcss/vite**: Generate CSS classes in dev, `@source inline()` in prod
- **swc/babel**: Use only in production for atomic CSS benefits
