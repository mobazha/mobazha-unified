import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'storefront/index': 'src/storefront/index.ts',
    'product/index': 'src/product/index.ts',
    'cart/index': 'src/cart/index.ts',
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
