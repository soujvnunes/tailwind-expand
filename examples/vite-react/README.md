# Vite + React Example

This example demonstrates `tailwind-expand` with Vite and React.

## Setup

```bash
pnpm install
pnpm dev
```

## Configuration

**vite.config.ts:**
```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [
          ['tailwind-expand', {
            cssPath: './src/globals.css',
          }],
        ],
      },
    }),
  ],
})
```

## How It Works

1. Define aliases in `src/globals.css` using `@expand`
2. Use aliases in JSX: `className="Button ButtonMd ButtonPrimary"`
3. At build time, aliases expand to Tailwind utilities
4. Inspect the DOM to see the actual classes!
