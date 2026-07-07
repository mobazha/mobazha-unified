// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
/* global process, console */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join, relative, sep } from 'node:path';

const repoRoot = process.cwd();
const expectedChains = ['BTC', 'BCH', 'LTC'];
const expectedRails = ['utxo_transparent'];
const manifest = JSON.parse(readFileSync(join(repoRoot, 'config/editions/community.json'), 'utf8'));

function fail(message) {
  console.error(`community boundary check failed: ${message}`);
  process.exitCode = 1;
}

function normalized(path) {
  return relative(repoRoot, path).split(sep).join('/');
}

if (manifest.edition !== 'community' || manifest.license !== 'MPL-2.0') {
  fail('edition identity or license drifted');
}
if (JSON.stringify(manifest.payment?.chains) !== JSON.stringify(expectedChains)) {
  fail(`default payment chains must be exactly ${expectedChains.join(', ')}`);
}
if (JSON.stringify(manifest.payment?.rails) !== JSON.stringify(expectedRails)) {
  fail(`default payment rails must be exactly ${expectedRails.join(', ')}`);
}
if ('zcash' in manifest) {
  fail('Zcash compatibility metadata must not widen the Community manifest');
}

const dependencyFiles = [
  'package.json',
  'pnpm-lock.yaml',
  ...readdirSync(join(repoRoot, 'apps'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join('apps', entry.name, 'package.json')),
  ...readdirSync(join(repoRoot, 'packages'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join('packages', entry.name, 'package.json')),
];
const dependencyText = dependencyFiles
  .filter(file => existsSync(join(repoRoot, file)))
  .map(file => readFileSync(join(repoRoot, file), 'utf8'))
  .join('\n');
for (const forbidden of ['@reown/', '@walletconnect/']) {
  if (dependencyText.includes(forbidden)) {
    fail(`closed connector dependency is present: ${forbidden}`);
  }
}

// Solana is allowed only for the reviewed Collectibles redemption flow. This
// exception does not authorize a general payment wallet, executor, or adapter.
const allowedSolanaImports = new Set([
  'packages/core/collectibles/burnTx.ts',
  'packages/core/collectibles/transferTx.ts',
  'packages/core/utils/solana.ts',
  'packages/core/__tests__/collectibles/burnTx.test.ts',
  'packages/core/__tests__/collectibles/transferTx.test.ts',
]);

const forbiddenExecutionPaths = [
  'packages/core/hooks/useSolanaWallet.ts',
  'packages/core/services/payment/solana.ts',
  'packages/core/services/transaction/evmExecutor.ts',
  'packages/core/services/transaction/solanaExecutor.ts',
  'packages/core/services/transaction/transactionService.ts',
];
for (const path of forbiddenExecutionPaths) {
  if (existsSync(join(repoRoot, path))) {
    fail(`retired chain payment executor remains in the public tree: ${path}`);
  }
}

const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);
// Keep private product identifiers out of the public repository, including
// this gate. Fingerprints are SHA-256 hashes of lowercase one-to-three-word
// identifiers; the scanner derives the same n-grams from paths and sources.
const privateProductFingerprints = new Set([
  '7daf48f924f246f48e576104ccc8c6e2fd7ef4a9f427ac9a8e7f7dfd43f87b1d',
  '9fe35c7be13e8b173bdf65f69094d4571a1071c2627742c701cbc4cf117cbbe0',
  'ce22c35e51d4b995366a73cdd840edb3430a6b89a1dc8da8dee10e40bd52425d',
  'df55e4d9ccbf0d50326a5995d65a337c0829f317776dd9040e3e8731ef332795',
  '5d354fb2b7e6edb8d418cc164f8584963f43bd853c025fb79ebb7e128c4f59e8',
]);
const privatePaymentFingerprints = new Set([
  '4469412a3887c4b146059ec7f86cd06d0da86bfa5748df1256e463164a0797f7',
  '6e25b931843001d83880c41190cf48f042cefe0acc5d6220fb51680ec27be947',
]);
const retiredPrivateIdentifiers = ['allowUserCustomNode', 'showNodePoolUI'];

function fingerprint(value) {
  return createHash('sha256').update(value).digest('hex');
}

function containsFingerprint(value, fingerprints) {
  const words = value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (let width = 1; width <= 3; width += 1) {
    for (let offset = 0; offset + width <= words.length; offset += 1) {
      if (fingerprints.has(fingerprint(words.slice(offset, offset + width).join(' ')))) {
        return true;
      }
    }
  }
  return false;
}

function isTestOrFixture(path) {
  return (
    path.includes('/__tests__/') ||
    path.includes('/fixtures/') ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path)
  );
}

// Commercial / sovereign overlays are not part of the Community Edition
// projection. They stay in the private monorepo but are excluded from the
// fingerprint gate that prepares sanitized public exports.
function isCommercialBoundaryExcluded(publicPath) {
  return (
    publicPath.includes('_sovereign.') ||
    publicPath.endsWith('/sovereign.d.ts') ||
    publicPath.endsWith('/routes.commercial.tsx') ||
    publicPath.includes('/commercial/')
  );
}

function scanSourceTree(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const child = join(path, entry.name);
    const publicPath = normalized(child);
    if (entry.isDirectory()) {
      scanSourceTree(child);
      continue;
    }
    if (
      containsFingerprint(
        publicPath,
        new Set([...privateProductFingerprints, ...privatePaymentFingerprints])
      )
    ) {
      fail(`private implementation path leaked into public tree: ${publicPath}`);
    }
    if (!textExtensions.has(extname(entry.name))) continue;
    if (isCommercialBoundaryExcluded(publicPath)) continue;
    const source = readFileSync(child, 'utf8');
    if (containsFingerprint(source, privateProductFingerprints)) {
      fail(`private product identity leaked into production source: ${publicPath}`);
    }
    if (
      !isTestOrFixture(`/${publicPath}`) &&
      containsFingerprint(source, privatePaymentFingerprints)
    ) {
      fail(`private payment implementation leaked into production source: ${publicPath}`);
    }
    for (const identifier of retiredPrivateIdentifiers) {
      if (source.includes(identifier)) {
        fail(`retired private frontend identifier leaked into public source: ${publicPath}`);
      }
    }
    if (/\b(?:from\s*|require\s*\()['"]@solana\/web3\.js['"]/.test(source)) {
      if (!allowedSolanaImports.has(publicPath)) {
        fail(`Solana SDK import is outside the Collectibles allowlist: ${publicPath}`);
      }
    }
  }
}

for (const publicRoot of [
  'apps/web/src',
  'apps/web/e2e',
  'packages/core',
  'packages/commerce-kit',
]) {
  scanSourceTree(join(repoRoot, publicRoot));
}

if (process.exitCode) process.exit(process.exitCode);
console.log('community boundary check passed');
