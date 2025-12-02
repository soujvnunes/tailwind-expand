import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tailwindExpandVite from '@tailwind-expand/vite'
import tailwindExpandBabel from '@tailwind-expand/babel'
import { twMerge } from 'tailwind-merge'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Transform @expand blocks before Tailwind processes CSS
    tailwindExpandVite({ mergerFn: twMerge }),
    tailwindcss(),
    react({
      babel: {
        plugins: [
          tailwindExpandBabel({
            cssPath: './src/globals.css',
            mergerFn: twMerge,
            debug: process.env.NODE_ENV !== 'production',
          }),
        ],
      },
    }),
  ],
})
