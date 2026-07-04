// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { readFileSync } from 'node:fs';

const failures = [];
const fail = message => failures.push(message);

const movedNotices = new Map([
  [
    'docs/architecture/RUNTIME_CAPABILITIES.md',
    'https://docs.mobazha.org/build/runtime-capabilities',
  ],
  ['docs/TOKEN_STANDARD_GUIDE.md', 'https://docs.mobazha.org/build/token-identifiers'],
]);

for (const [path, canonicalUrl] of movedNotices) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes('non-normative moved notice')) fail(`${path} is not marked non-normative`);
  if (!source.includes(canonicalUrl)) fail(`${path} does not link ${canonicalUrl}`);
  if (/^##\s/m.test(source)) fail(`${path} contains duplicate documentation sections`);
}

const readme = readFileSync('README.md', 'utf8');
for (const url of [
  'https://docs.mobazha.org',
  'https://docs.mobazha.org/build/runtime-capabilities',
  'https://docs.mobazha.org/project/roadmap',
]) {
  if (!readme.includes(url)) fail(`README.md is missing ${url}`);
}

for (const path of [
  'docs/PROFESSIONAL_GRADE_ROADMAP.md',
  'docs/MOBILE_FIRST_ROADMAP.md',
  'docs/SAAS_HOMEPAGE_DESIGN.md',
]) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes('Implementation-local')) fail(`${path} is missing its implementation-local status`);
  if (!source.includes('https://docs.mobazha.org/project/roadmap')) {
    fail(`${path} is missing the canonical public roadmap`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`documentation authority check failed: ${failure}`);
  process.exit(1);
}

console.log('documentation authority check passed');
