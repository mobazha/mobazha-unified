import { describe, expect, it } from 'vitest';
import { formatOrderDate, formatOrderDateTime } from '@/components/Order/utils';

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

describe('formatOrderDateTime', () => {
  it('includes seconds by default', () => {
    const formatted = formatOrderDateTime('2026-05-30T12:54:12.000Z', { locale: 'en' });
    expect(formatted).toMatch(/May 30, 2026/);
    expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  it('returns null for empty or invalid values', () => {
    expect(formatOrderDateTime(undefined, { locale: 'en' })).toBeNull();
    expect(formatOrderDateTime('not-a-date', { locale: 'en' })).toBeNull();
  });
});
