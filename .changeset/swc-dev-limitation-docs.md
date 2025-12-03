---
"@tailwind-expand/swc": patch
---

docs(swc): document CSS alias development limitation and nodemon workaround

Added documentation explaining that CSS alias changes require a server restart in Next.js/Turbopack (not true HMR), with a workaround using nodemon to auto-restart the dev server.
