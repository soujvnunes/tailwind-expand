import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import tailwindExpand from 'tailwind-expand'
import tailwindExpandVite from 'tailwind-expand/vite'

const cssPath = './src/globals.css';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Transform @expand blocks before Tailwind processes CSS
    tailwindExpandVite(),
    tailwindcss(),
    react({
      babel: {
        plugins: [
          [tailwindExpand, { cssPath: path.resolve(__dirname, cssPath) }],
        ],
      },
    }),
  ],
})
