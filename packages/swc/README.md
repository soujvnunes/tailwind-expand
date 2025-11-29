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
