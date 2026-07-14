// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

// These assertions lock the *honesty* of the Deal Link copy surfaced by the
// review. They deliberately test the real EN/ZH strings — not the i18n key —
// because the defect was the wording promising more than the backend delivers.

import { describe, expect, it } from 'vitest';
import { translations } from '@mobazha/core';

type DealLinkCopy = {
  whatIsBody?: string;
  priceHint?: string;
  feeQuoteExpiredNotice?: string;
  feeQuoteInactiveNotice?: string;
  feeQuoteConflictError?: string;
};

function dealLinkCopy(locale: 'en' | 'zh'): DealLinkCopy {
  const resource = translations[locale] as unknown as Record<string, unknown>;
  const admin = resource.admin as Record<string, unknown> | undefined;
  return (admin?.dealLinks ?? {}) as DealLinkCopy;
}

describe('Deal Link copy truths', () => {
  describe('whatIsBody does not promise a protected link survives product changes', () => {
    it('EN keeps orders frozen but makes new purchases conditional on a valid published version', () => {
      const body = dealLinkCopy('en').whatIsBody ?? '';
      // Frozen numbered revision / order history stays honest.
      expect(body).toMatch(/numbered revision/i);
      expect(body).toMatch(/every order keeps the revision/i);
      // New purchases depend on the bound product staying current + published.
      expect(body).toMatch(/published/i);
      expect(body).toMatch(/stops accepting new purchases/i);
      // Must NOT claim the link keeps working after change/unpublish.
      expect(body).not.toMatch(/even if you later change or unpublish/i);
      // Must NOT promise the existing link can be repointed/updated — the UI
      // cannot rebind an old CID to a new published version; the only
      // available recovery is a new link.
      expect(body).not.toMatch(/update it to point at a valid published version/i);
      expect(body).toMatch(/cannot be repointed/i);
      expect(body).toMatch(/create a new protected link/i);
    });

    it('ZH mirrors the same conditional-purchase honesty', () => {
      const body = dealLinkCopy('zh').whatIsBody ?? '';
      expect(body).toContain('已发布');
      expect(body).toContain('停止接受新的购买');
      expect(body).toContain('已下单的订单不受影响');
      expect(body).not.toContain('直到你将其更新为指向一个有效的已发布版本');
      expect(body).toContain('无法重新指向新版本');
      expect(body).toContain('创建一个新的受保护链接');
    });
  });

  describe('priceHint clarifies total-vs-per-unit', () => {
    it('EN states it is the total for the whole purchase, not per-unit', () => {
      const hint = dealLinkCopy('en').priceHint ?? '';
      expect(hint).toMatch(/total agreed price/i);
      expect(hint).toMatch(/not a per-unit price/i);
    });

    it('ZH states 总价 rather than 单价', () => {
      const hint = dealLinkCopy('zh').priceHint ?? '';
      expect(hint).toContain('总价');
      expect(hint).toContain('而非单价');
    });
  });

  describe('fee-quote states read honestly', () => {
    it('EN expired notice tells the seller how to recover', () => {
      const copy = dealLinkCopy('en');
      expect(copy.feeQuoteExpiredNotice).toMatch(/extend the expiry/i);
      expect(copy.feeQuoteExpiredNotice).toMatch(/save a new revision/i);
      // Draft/paused/closed notice stays distinct from the expired one.
      expect(copy.feeQuoteInactiveNotice).not.toEqual(copy.feeQuoteExpiredNotice);
    });

    it('EN 409 conflict copy names every current 409 cause, not just inactive', () => {
      const conflict = dealLinkCopy('en').feeQuoteConflictError ?? '';
      expect(conflict).toMatch(/inactive or expired/i);
      expect(conflict).toMatch(/unpublished|no longer current/i);
      expect(conflict).toMatch(/options/i);
      expect(conflict).toMatch(/delivery/i);
    });

    it('ZH 409 conflict copy names the same causes', () => {
      const conflict = dealLinkCopy('zh').feeQuoteConflictError ?? '';
      expect(conflict).toContain('未激活或已过期');
      expect(conflict).toContain('下架');
      expect(conflict).toContain('选项无效');
      expect(conflict).toContain('配送不可用');
    });
  });
});
