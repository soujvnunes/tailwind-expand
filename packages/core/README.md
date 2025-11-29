# @tailwind-expand/core

Core utilities for tailwind-expand. This is an internal package used by other @tailwind-expand packages.

## Installation

```bash
pnpm add @tailwind-expand/core
```

## API

### `extract(cssPath: string)`

Parses a CSS file and extracts all `@expand` block aliases.

```ts
import { extract } from '@tailwind-expand/core'

const result = extract('./globals.css')
// { aliases: { Button: 'text-sm inline-flex', ButtonMd: 'h-10 px-4' }, hash: '...' }
```

### `extractFromCSS(css: string, sourcePath?: string)`

Parses CSS content directly.

```ts
import { extractFromCSS } from '@tailwind-expand/core'

const aliases = extractFromCSS(`
  @expand Button {
    @apply text-sm;
  }
`)
// { Button: 'text-sm' }
```

### `expand(aliases: AliasMap)`

Resolves alias references (e.g., when `Button` contains `TypographyCaption`).

```ts
import { expand } from '@tailwind-expand/core'

const expanded = expand({
  TypographyCaption: 'text-xs font-bold',
  Button: 'TypographyCaption inline-flex',
})
// { TypographyCaption: 'text-xs font-bold', Button: 'text-xs font-bold inline-flex' }
```

### `scanSourceFiles(dir: string, aliases: AliasMap, variantUtilities: Set<string>)`

Scans source files for variant-prefixed aliases (e.g., `lg:Button`) and collects them.

### `collectVariantAliases(code: string, aliases: AliasMap, variantUtilities: Set<string>)`

Collects variant-prefixed aliases from a single code string.

## License

MIT
