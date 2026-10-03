// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useScrollToFirstError } from '@/hooks/useScrollToFirstError';

type Props = { attempts: number; field: string | undefined };

function setup(initial: Props) {
  const onFirstError = vi.fn();
  const view = renderHook(
    ({ attempts, field }: Props) => useScrollToFirstError(attempts, field, onFirstError),
    { initialProps: initial }
  );
  return { onFirstError, rerender: view.rerender };
}

describe('useScrollToFirstError', () => {
  it('does nothing before the first failed submit, even when errors already exist', () => {
    const { onFirstError } = setup({ attempts: 0, field: 'title' });

    expect(onFirstError).not.toHaveBeenCalled();
  });

  it('fires once per failed submit with the first error at that moment', () => {
    const { onFirstError, rerender } = setup({ attempts: 0, field: undefined });

    // The same render batch that counts the attempt also carries the new errors.
    rerender({ attempts: 1, field: 'title' });

    expect(onFirstError).toHaveBeenCalledTimes(1);
    expect(onFirstError).toHaveBeenLastCalledWith('title');
  });

  it('fires again on a repeat submit even though the first error is unchanged', () => {
    const { onFirstError, rerender } = setup({ attempts: 1, field: 'title' });
    onFirstError.mockClear();

    rerender({ attempts: 2, field: 'title' });

    expect(onFirstError).toHaveBeenCalledTimes(1);
    expect(onFirstError).toHaveBeenLastCalledWith('title');
  });

  it('does not scroll when fixing a field moves the first error to the next field', () => {
    const { onFirstError, rerender } = setup({ attempts: 1, field: 'title' });
    onFirstError.mockClear();

    // The seller types in Title: its error clears and "images" becomes the first one.
    rerender({ attempts: 1, field: 'images' });
    rerender({ attempts: 1, field: undefined });

    expect(onFirstError).not.toHaveBeenCalled();
  });

  it('stays quiet when a failed submit leaves no error field to go to', () => {
    const { onFirstError, rerender } = setup({ attempts: 0, field: undefined });

    rerender({ attempts: 1, field: undefined });

    expect(onFirstError).not.toHaveBeenCalled();
  });
});
