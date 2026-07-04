import { describe, expect, it } from 'vitest';
import { CommerceHttpError } from './http';
import { resolveCommerceErrorLabel } from './labels';

describe('resolveCommerceErrorLabel', () => {
  it('maps typed transport failures to stable host-owned labels', () => {
    const labels = (key: string, values?: Readonly<Record<string, unknown>>): string =>
      `${key}:${String(values?.requestId ?? '')}`;

    expect(
      resolveCommerceErrorLabel(
        new CommerceHttpError('backend text', {
          kind: 'timeout',
          requestId: 'request-1',
        }),
        labels
      )
    ).toBe('commerce.error.timeout:request-1');
  });

  it('uses a generic label for unknown failures', () => {
    expect(resolveCommerceErrorLabel(new Error('secret'), key => key)).toBe(
      'commerce.error.unknown'
    );
  });
});
