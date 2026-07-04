#!/usr/bin/env node

import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = join(repositoryRoot, 'packages', 'commerce-kit');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'mobazha-commerce-kit-consumers-'));

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, CI: 'true', HUSKY: '0' },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

async function write(path, contents) {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, contents);
}

async function installAndBuild(directory) {
  run('corepack', ['pnpm', 'install', '--no-frozen-lockfile', '--ignore-workspace'], directory);
  run('corepack', ['pnpm', 'build'], directory);
}

async function assertClientDirectives(unpackedRoot) {
  const entrypoints = [
    'admin/index.js',
    'admin/index.mjs',
    'cart/index.js',
    'cart/index.mjs',
    'checkout/client.js',
    'checkout/client.mjs',
    'product/index.js',
    'product/index.mjs',
  ];
  for (const entrypoint of entrypoints) {
    const source = await readFile(join(unpackedRoot, 'package', 'dist', entrypoint), 'utf8');
    if (!/^(?:["']use strict["'];\n)?["']use client["'];/.test(source)) {
      throw new Error(`packed entrypoint lost its client boundary: ${entrypoint}`);
    }
  }

  const serverEntrypoints = ['index.js', 'index.mjs', 'checkout/index.js', 'checkout/index.mjs'];
  for (const entrypoint of serverEntrypoints) {
    const source = await readFile(join(unpackedRoot, 'package', 'dist', entrypoint), 'utf8');
    if (/^(?:["']use strict["'];\n)?["']use client["'];/.test(source)) {
      throw new Error(`server-safe entrypoint became a client boundary: ${entrypoint}`);
    }
  }
}

async function createViteConsumer(directory, tarballPath) {
  await write(
    join(directory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'commerce-kit-vite-consumer',
        private: true,
        type: 'module',
        packageManager: 'pnpm@9.15.4',
        scripts: { build: 'tsc --noEmit && vite build' },
        dependencies: {
          '@mobazha/commerce-kit': `file:${tarballPath}`,
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: {
          '@types/react': '^19.0.2',
          '@types/react-dom': '^19.0.2',
          typescript: '^5.7.2',
          vite: '^7.3.5',
        },
      },
      null,
      2
    )}\n`
  );
  await write(
    join(directory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2
    )}\n`
  );
  await write(
    join(directory, 'index.html'),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n'
  );
  await write(
    join(directory, 'src', 'main.tsx'),
    `import '@mobazha/commerce-kit/styles.css';
import { createRoot } from 'react-dom/client';
import { CommerceButton } from '@mobazha/commerce-kit/admin';
import {
  normalizeGuestCheckoutSettings,
  type CommerceGuestOrderRequest,
} from '@mobazha/commerce-kit/checkout';
import type { GuestCheckoutPanelProps } from '@mobazha/commerce-kit/checkout/client';

const request: CommerceGuestOrderRequest = { items: [], paymentCoin: 'BTC' };
const panelTitle: GuestCheckoutPanelProps['title'] = 'Packed checkout';
const settings = normalizeGuestCheckoutSettings({
  enabled: true,
  acceptedCoins: 'BTC',
  availableCoins: 'BTC',
  paymentTimeout: 30,
});

createRoot(document.getElementById('root')!).render(
  <CommerceButton type="button">
    {panelTitle}:{settings.availableCoins[0]}:{request.paymentCoin}
  </CommerceButton>
);
`
  );
}

async function createNextConsumer(directory, tarballPath) {
  await write(
    join(directory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'commerce-kit-next-consumer',
        private: true,
        packageManager: 'pnpm@9.15.4',
        scripts: { build: 'next build --webpack' },
        dependencies: {
          '@mobazha/commerce-kit': `file:${tarballPath}`,
          next: '^16.2.6',
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: {
          '@types/node': '^22.10.2',
          '@types/react': '^19.0.2',
          '@types/react-dom': '^19.0.2',
          typescript: '^5.7.2',
        },
      },
      null,
      2
    )}\n`
  );
  await write(
    join(directory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2017',
          lib: ['DOM', 'DOM.Iterable', 'ESNext'],
          allowJs: false,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'ESNext',
          moduleResolution: 'Bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
        },
        include: ['next-env.d.ts', '.next/types/**/*.ts', '**/*.ts', '**/*.tsx'],
        exclude: ['node_modules'],
      },
      null,
      2
    )}\n`
  );
  await write(
    join(directory, 'next-env.d.ts'),
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n'
  );
  await write(
    join(directory, 'app', 'layout.tsx'),
    `import '@mobazha/commerce-kit/styles.css';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <html><body>{children}</body></html>;
}
`
  );
  await write(
    join(directory, 'app', 'page.tsx'),
    `import { CommerceCard } from '@mobazha/commerce-kit/admin';
import { normalizeGuestCheckoutSettings } from '@mobazha/commerce-kit/checkout';

export default function Page() {
  const settings = normalizeGuestCheckoutSettings({
    enabled: true,
    acceptedCoins: 'BTC',
    availableCoins: 'BTC',
    paymentTimeout: 30,
  });
  return <CommerceCard>{settings.availableCoins.join(',')}</CommerceCard>;
}
`
  );
}

try {
  run('corepack', ['pnpm', '--filter', '@mobazha/commerce-kit', 'build'], repositoryRoot);
  run('corepack', ['pnpm', 'pack', '--pack-destination', temporaryRoot], packageRoot);

  const tarballName = (await readdir(temporaryRoot)).find(name => name.endsWith('.tgz'));
  if (!tarballName) throw new Error('commerce-kit tarball was not produced');
  const tarballPath = join(temporaryRoot, tarballName);
  const unpackedRoot = join(temporaryRoot, 'unpacked');
  await mkdir(unpackedRoot);
  run('tar', ['-xzf', tarballPath, '-C', unpackedRoot], repositoryRoot);
  await assertClientDirectives(unpackedRoot);

  const viteConsumer = join(temporaryRoot, 'vite-consumer');
  const nextConsumer = join(temporaryRoot, 'next-consumer');
  await createViteConsumer(viteConsumer, tarballPath);
  await createNextConsumer(nextConsumer, tarballPath);
  await installAndBuild(viteConsumer);
  await installAndBuild(nextConsumer);
  process.stdout.write('commerce-kit packed Vite and Next.js consumers: OK\n');
} finally {
  if (process.env.COMMERCE_KIT_CONSUMER_KEEP !== '1') {
    await rm(temporaryRoot, { recursive: true, force: true });
  } else {
    process.stdout.write(`commerce-kit consumer fixtures kept at ${temporaryRoot}\n`);
  }
}
