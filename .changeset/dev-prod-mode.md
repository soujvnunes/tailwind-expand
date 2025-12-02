---
"@tailwind-expand/core": minor
"@tailwind-expand/swc": minor
"@tailwind-expand/babel": minor
"@tailwind-expand/vite": patch
"@tailwind-expand/postcss": patch
---

Add `debug` option to show expanded aliases in DevTools

Enable `debug: true` to add a `data-expand` attribute showing which aliases were expanded:

```jsx
// With debug: true
<button data-expand="Button ButtonMd lg:Button" className="text-xs font-bold h-10 px-4 lg:text-xs lg:font-bold" />

// With debug: false (default)
<button className="text-xs font-bold h-10 px-4 lg:text-xs lg:font-bold" />
```

This is SSR-friendly and keeps className clean while providing debugging visibility.

### Changes

- **core**: Add `debug?: boolean` to `ExpandPluginOptions` type
- **babel**: Add `data-expand` attribute when `debug: true`
- **swc**: Add `data-expand` attribute when `debug: true`
