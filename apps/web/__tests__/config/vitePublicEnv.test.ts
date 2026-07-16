// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

describe('Vite public environment compatibility', () => {
  it('defines the marketplace subdomain base for browser bundles', () => {
    const configSource = readFileSync(path.resolve(__dirname, '../../vite.config.ts'), 'utf8');

    expect(configSource).toContain(
      "'process.env.NEXT_PUBLIC_MARKETPLACE_SUBDOMAIN_BASE': JSON.stringify("
    );
  });
});
