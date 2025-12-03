# @tailwind-expand/swc

SWC plugin for tailwind-expand. Inlines className aliases into utility classes in Next.js with Turbopack.

## Installation

```bash
pnpm add -D @tailwind-expand/swc @tailwind-expand/postcss
```

## Usage

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

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cssPath` | `string` | — | Path to CSS file containing `@expand` definitions (required) |
| `mergerFn` | `(classes: string) => string` | — | Function to resolve conflicting utilities (e.g., `twMerge`) |
| `debug` | `boolean` | `false` | Add `data-expand` attribute with expanded alias names |

### With tailwind-merge and debug mode

```ts
import tailwindExpandSWC from '@tailwind-expand/swc'
import { twMerge } from 'tailwind-merge'

const nextConfig = {
  experimental: {
    swcPlugins: [tailwindExpandSWC({
      cssPath: './app/globals.css',
      mergerFn: twMerge,
      debug: process.env.NODE_ENV !== 'production',
    })],
  },
}
```

## How It Works

The SWC plugin runs inside a WASI sandbox which cannot access the filesystem directly. This package includes a TypeScript wrapper that:

1. Reads the CSS file at build time
2. Extracts and expands all aliases using `@tailwind-expand/core`
3. Passes pre-expanded aliases to the WASM plugin

The WASM plugin then transforms JSX className attributes using the provided aliases.

## Development Limitation

**CSS alias changes require a server restart.** This is not true HMR.

Because aliases are read at config load time (not during transform), changes to `@expand` blocks in your CSS won't be reflected until the dev server restarts. Turbopack caches SWC transform results and doesn't expose cache invalidation APIs.

### Workaround: Auto-restart with nodemon

Use nodemon to automatically restart the dev server when CSS changes:

```bash
pnpm add -D nodemon
```

Add to `package.json`:

```json
{
  "scripts": {
    "dev:watch": "nodemon"
  },
  "nodemonConfig": {
    "watch": ["app/globals.css"],
    "ext": "css",
    "ignore": [".next", "node_modules"],
    "exec": "next dev"
  }
}
```

Run `pnpm dev:watch` instead of `pnpm dev`.

**Note:** This restarts the entire server, so React state is lost. It's a workaround, not true HMR.

## Building from Source

### Prerequisites

1. Install Rust: https://rustup.rs/
2. The `rust-toolchain.toml` will automatically install the correct Rust version (1.83.0) and WASM target

### Build

```bash
cd packages/swc
pnpm build
```

This runs:
1. `cargo build --target wasm32-wasip1 --release` - Compiles Rust to WASM
2. `tsup` - Builds the TypeScript wrapper

## Verifying the WASM Binary

The published package includes a SHA256 checksum for the WASM binary.

### Verify an installed package

```bash
cd node_modules/@tailwind-expand/swc
shasum -a 256 -c tailwind_expand_swc.wasm.sha256
```

### Generate checksum after building

```bash
pnpm checksum
```

### Verify checksum

```bash
pnpm verify
```

## Reproducible Builds

For reproducible builds, ensure:

1. Same Rust version (pinned in `rust-toolchain.toml`)
2. Same build flags:
   ```bash
   CARGO_INCREMENTAL=0 RUSTFLAGS='-C debuginfo=0' cargo build --target wasm32-wasip1 --release
   ```

CI builds use these exact settings to ensure deterministic output.

## License

MIT
