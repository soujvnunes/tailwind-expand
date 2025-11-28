# tailwind-expand-swc

SWC plugin for tailwind-expand. Enables className expansion in Next.js with Turbopack.

> **Status**: Work in Progress

## Prerequisites

1. Install Rust: https://rustup.rs/
2. Add WASM target:
   ```bash
   rustup target add wasm32-wasip1
   ```

## Development

```bash
# Build the plugin
cargo build-wasi --release

# Copy to package root for npm
cp target/wasm32-wasip1/release/tailwind_expand_swc.wasm .
```

## Usage with Next.js

```js
// next.config.js
module.exports = {
  experimental: {
    swcPlugins: [
      ["tailwind-expand-swc", { cssPath: "./app/globals.css" }]
    ]
  }
}
```

## TODO

- [ ] Implement CSS file reading and @expand block parsing
- [ ] Add support for alias references (TypographyCaption in Button)
- [ ] Add tests
- [ ] Handle template literals
- [ ] Handle cn() / clsx() calls
