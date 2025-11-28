import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/postcss.ts', 'src/vite.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
