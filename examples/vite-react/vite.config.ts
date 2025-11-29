import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { vite } from '@tailwind-expand/vite'
import { babel } from '@tailwind-expand/babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Transform @expand blocks before Tailwind processes CSS
    vite(),
    tailwindcss(),
    react({
      babel: {
        plugins: [[babel, { cssPath: './src/globals.css' }]],
      },
    }),
  ],
})
