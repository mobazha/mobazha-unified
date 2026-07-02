// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const expectedChains = ['BTC', 'BCH', 'LTC'];
const manifest = JSON.parse(readFileSync('config/editions/community.json', 'utf8'));

function fail(message) {
  console.error(`community boundary check failed: ${message}`);
  process.exit(1);
}

if (manifest.edition !== 'community' || manifest.license !== 'MPL-2.0') {
  fail('edition identity or license drifted');
}

if (JSON.stringify(manifest.payment?.chains) !== JSON.stringify(expectedChains)) {
  fail(`default payment chains must be exactly ${expectedChains.join(', ')}`);
}

if ('zcash' in manifest) {
  fail('Zcash compatibility metadata must not widen the Community release manifest');
}

const dependencyFiles = [
  'package.json',
  'pnpm-lock.yaml',
  ...readdirSync('apps', { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join('apps', entry.name, 'package.json')),
  ...readdirSync('packages', { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join('packages', entry.name, 'package.json')),
];
const dependencyText = dependencyFiles.map(file => readFileSync(file, 'utf8')).join('\n');
for (const forbidden of ['@reown/', '@walletconnect/']) {
  if (dependencyText.includes(forbidden)) {
    fail(`closed connector dependency is present: ${forbidden}`);
  }
}

const publicTextExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);
const privateProductName = ['out', 'post'].join('');
const privateIdentity = new RegExp(
  `\\b(?:${privateProductName}|mobazha[-_ ]commercial|commercial[-_ ]node|asgardium|the market place)\\b`,
  'i'
);
const privateImplementation = /\b(?:monero|xmr)\b/i;

function scanPublicTree(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      scanPublicTree(child);
      continue;
    }
    if (privateImplementation.test(child)) {
      fail(`private implementation path leaked into public tree: ${child}`);
    }
    if (!publicTextExtensions.has(extname(entry.name))) continue;
    const source = readFileSync(child, 'utf8');
    if (privateIdentity.test(source)) {
      fail(`private product identity leaked into production source: ${child}`);
    }
    if (privateImplementation.test(source)) {
      fail(`private implementation leaked into public source: ${child}`);
    }
  }
}

for (const publicRoot of [
  'apps/web/src',
  'apps/web/e2e',
  'packages/core',
  'packages/commerce-web',
]) {
  scanPublicTree(publicRoot);
}
console.log('community boundary check passed');
