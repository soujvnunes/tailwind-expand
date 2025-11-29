# @tailwind-expand/swc

SWC plugin for tailwind-expand. Enables className expansion in Next.js with Turbopack.

## Installation

```bash
pnpm add -D @tailwind-expand/swc @tailwind-expand/postcss
```

## Usage

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

## How It Works

The SWC plugin runs inside a WASI sandbox which cannot access the filesystem directly. This package includes a TypeScript wrapper that:

1. Reads the CSS file at build time
2. Extracts and expands all aliases using `@tailwind-expand/core`
3. Passes pre-expanded aliases to the WASM plugin

The WASM plugin then transforms JSX className attributes using the provided aliases.

## Building from Source

### Prerequisites

1. Install Rust: https://rustup.rs/
2. Add WASM target:
   ```bash
   rustup target add wasm32-wasip1
   ```

### Build

```bash
cd packages/swc
cargo build-wasi --release
cp target/wasm32-wasip1/release/tailwind_expand_swc.wasm .
pnpm build
```

## License

MIT
