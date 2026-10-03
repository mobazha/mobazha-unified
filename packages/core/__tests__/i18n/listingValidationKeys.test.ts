// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '../../i18n/types';
import { translations } from '../../i18n/locales';

// useListingForm stores translation KEYS (not prose) in its `errors`; a key that is missing
// from a locale would reach the seller as the literal text "validation.titleRequired".
const hookPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../hooks/useListingForm.ts');
const hookSource = readFileSync(hookPath, 'utf8');
const emittedKeys = Array.from(
  new Set(Array.from(hookSource.matchAll(/'(validation\.[A-Za-z]+)'/g), match => match[1]))
);

function lookup(resource: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      resource
    );
}

describe('useListingForm validation messages', () => {
  it('stores translation keys in the form errors', () => {
    expect(emittedKeys.length).toBeGreaterThan(0);
  });

  it.each(SUPPORTED_LOCALES)('%s defines every validation key the form emits', locale => {
    const missing = emittedKeys.filter(
      key => typeof lookup(translations[locale], key) !== 'string'
    );
    expect(missing).toEqual([]);
  });
});
