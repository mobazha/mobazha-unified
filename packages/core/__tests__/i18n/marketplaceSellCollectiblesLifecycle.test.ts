// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, beforeEach } from 'vitest';
import { getTranslation, setLocale } from '../../i18n/i18n';
import type { SourceDepositLifecycleStep } from '../../collectibles/sourceDeposit';

const SELLER_LIFECYCLE_STEPS: SourceDepositLifecycleStep[] = [
  'submit',
  'review',
  'list',
  'listed',
  'redeem',
];

const lifecycleKey = (step: SourceDepositLifecycleStep) =>
  `marketplace.sell.collectibles.workspace.lifecycle.${step}`;

describe('marketplace sell collectibles lifecycle i18n', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it.each(SELLER_LIFECYCLE_STEPS)('resolves English copy for %s', step => {
    const key = lifecycleKey(step);
    const value = getTranslation(key);
    expect(value).not.toBe(key);
    expect(value.trim().length).toBeGreaterThan(0);
  });

  it.each(SELLER_LIFECYCLE_STEPS)('resolves Chinese copy for %s', step => {
    setLocale('zh');
    const key = lifecycleKey(step);
    const value = getTranslation(key);
    expect(value).not.toBe(key);
    expect(value.trim().length).toBeGreaterThan(0);
  });

  it('does not resolve deprecated lifecycle key paths', () => {
    setLocale('zh');
    expect(getTranslation('marketplace.sell.collectibles.lifecycle.submit')).toBe(
      'marketplace.sell.collectibles.lifecycle.submit'
    );
  });
});
