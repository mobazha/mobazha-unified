import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    composition: 'src/composition.ts',
    'storefront/index': 'src/storefront/index.tsx',
    'product/index': 'src/product/index.tsx',
    'cart/index': 'src/cart/index.tsx',
    'checkout/index': 'src/checkout/index.ts',
    'checkout/client': 'src/checkout/client.ts',
    'admin/index': 'src/admin/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react'],
  treeshake: false,
  splitting: false,
  minify: false,
});
