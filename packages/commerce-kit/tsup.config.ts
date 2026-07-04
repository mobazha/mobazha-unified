import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'storefront/index': 'src/storefront/index.tsx',
    'product/index': 'src/product/index.tsx',
    'cart/index': 'src/cart/index.tsx',
    'checkout/index': 'src/checkout/index.ts',
    'admin/index': 'src/admin/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react'],
  treeshake: true,
  splitting: false,
  minify: false,
});
