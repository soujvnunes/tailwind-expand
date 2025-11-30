---
"@tailwind-expand/vite": minor
"@tailwind-expand/swc": minor
"@tailwind-expand/babel": minor
---

BREAKING: Change plugins from named exports to default exports

Migration:
```js
// Before
import { vite } from '@tailwind-expand/vite'
import { swc } from '@tailwind-expand/swc'
import { babel } from '@tailwind-expand/babel'

// After
import tailwindExpandVite from '@tailwind-expand/vite'
import tailwindExpandSWC from '@tailwind-expand/swc'
import tailwindExpandBabel from '@tailwind-expand/babel'
```
