import { describe, expect, it } from 'vitest';
import { formatOrderDate } from '@/components/Order/utils';

describe('formatOrderDate', () => {
  it('uses zh-CN formatting when locale is zh', () => {
    const formatted = formatOrderDate('2026-05-30T12:54:12.000Z', {
      locale: 'zh',
      includeSeconds: true,
    });

    expect(formatted).toMatch(/2026.*5.*30.*\d{2}:\d{2}:12/);
    expect(formatted).not.toMatch(/May|PM/i);
  });

  it('uses en-US formatting when locale is en', () => {
    const formatted = formatOrderDate('2026-05-30T12:54:12.000Z', {
      locale: 'en',
      includeSeconds: true,
    });

    expect(formatted).toMatch(/May 30, 2026/);
  });
});
