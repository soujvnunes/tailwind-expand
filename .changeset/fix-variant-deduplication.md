---
"@tailwind-expand/core": patch
"@tailwind-expand/babel": patch
"@tailwind-expand/swc": patch
---

fix: deduplicate variant prefixes to prevent hover:hover:, dark:dark:, etc.

When applying a variant prefix (e.g., `hover:`) to an alias that already contains utilities with that same prefix, we now correctly deduplicate instead of producing invalid class names like `hover:hover:bg-primary/90`.

Example:
- Before: `hover:ButtonPrimary` → `hover:bg-primary hover:hover:bg-primary/90`
- After: `hover:ButtonPrimary` → `hover:bg-primary hover:bg-primary/90`
