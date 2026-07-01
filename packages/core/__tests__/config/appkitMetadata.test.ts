// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function loadAppKit() {
  vi.resetModules();
  return import('../../config/appkit');
}

describe('APPKIT_METADATA.url', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('uses NEXT_PUBLIC_SITE_URL when set to a valid URL', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://store.example.com';
    const { APPKIT_METADATA } = await loadAppKit();
    expect(APPKIT_METADATA.url).toBe('https://store.example.com');
  });

  it('falls back to mobazha.org when env is unset', async () => {
    const { APPKIT_METADATA } = await loadAppKit();
    expect(APPKIT_METADATA.url).toBe('https://mobazha.org');
  });

  it('falls back when env is empty or whitespace', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = '   ';
    const { APPKIT_METADATA } = await loadAppKit();
    expect(APPKIT_METADATA.url).toBe('https://mobazha.org');
  });

  it('falls back when env is not a valid URL', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'not-a-url';
    const { APPKIT_METADATA } = await loadAppKit();
    expect(APPKIT_METADATA.url).toBe('https://mobazha.org');
  });
});
