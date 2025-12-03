---
"@tailwind-expand/vite": patch
---

fix(vite): restart server when CSS with @expand blocks changes

Added HMR support for CSS alias changes. When a CSS file containing @expand blocks is modified, the Vite server now automatically restarts to clear all caches (including @vitejs/plugin-react's babel cache), ensuring JSX files are re-transformed with the updated alias values.
