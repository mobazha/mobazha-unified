import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCheckoutSubpageReturn } from '@/hooks/useCheckoutSubpageReturn';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
  useSearchParams: () =>
    new URLSearchParams('returnUrl=%2Fpayment%3ForderID%3Dabc%26vendorPeerID%3Dvendor1'),
}));

describe('useCheckoutSubpageReturn', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('navigates to the decoded returnUrl instead of using history.back()', () => {
    const { result } = renderHook(() => useCheckoutSubpageReturn('/checkout'));

    act(() => {
      result.current.navigateBack();
    });

    expect(pushMock).toHaveBeenCalledWith('/payment?orderID=abc&vendorPeerID=vendor1');
  });
});
