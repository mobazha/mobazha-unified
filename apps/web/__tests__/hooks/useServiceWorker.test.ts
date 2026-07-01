import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import {
  RELOAD_RECOVERY_MS,
  SKIP_WAITING_FALLBACK_MS,
  SKIP_WAITING_MESSAGE,
} from '@/lib/serviceWorkerUpdate';

describe('useServiceWorker update flow', () => {
  const reloadMock = vi.fn();
  const postMessageMock = vi.fn();

  let controllerChangeHandler: (() => void) | null = null;
  let mockRegistration: globalThis.ServiceWorkerRegistration;

  beforeEach(() => {
    reloadMock.mockReset();
    postMessageMock.mockReset();
    controllerChangeHandler = null;

    const waitingWorker = {
      postMessage: postMessageMock,
      addEventListener: vi.fn(),
    } as unknown as globalThis.ServiceWorker;

    mockRegistration = {
      waiting: waitingWorker,
      update: vi.fn(),
      addEventListener: vi.fn(),
    } as unknown as globalThis.ServiceWorkerRegistration;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadMock },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: {},
        register: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'controllerchange') {
            controllerChangeHandler = handler;
          }
        }),
        removeEventListener: vi.fn(),
        getRegistrations: vi.fn().mockResolvedValue([]),
      },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  async function renderReadyHook() {
    const hook = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(hook.result.current.isRegistered).toBe(true);
    });

    return hook;
  }

  it('shows the update banner when a waiting worker is present on registration', async () => {
    const { result } = await renderReadyHook();
    expect(result.current.updateAvailable).toBe(true);
  });

  it('posts SKIP_WAITING when a waiting worker exists', async () => {
    const { result } = await renderReadyHook();

    act(() => {
      result.current.update();
    });

    expect(postMessageMock).toHaveBeenCalledWith(SKIP_WAITING_MESSAGE);
    expect(result.current.isUpdating).toBe(true);
    expect(result.current.updateAvailable).toBe(true);
  });

  it('reloads immediately when no waiting worker exists', async () => {
    mockRegistration = {
      waiting: null,
      update: vi.fn(),
      addEventListener: vi.fn(),
    } as unknown as globalThis.ServiceWorkerRegistration;

    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRegistration
    );

    const { result } = await renderReadyHook();

    act(() => {
      result.current.update();
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(result.current.isUpdating).toBe(true);
  });

  it('falls back to reload when skip-waiting does not activate the worker', async () => {
    const { result } = await renderReadyHook();

    vi.useFakeTimers();
    act(() => {
      result.current.update();
    });

    act(() => {
      vi.advanceTimersByTime(SKIP_WAITING_FALLBACK_MS);
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('reloads on controllerchange after the user starts an update', async () => {
    const { result } = await renderReadyHook();

    act(() => {
      result.current.update();
    });

    act(() => {
      controllerChangeHandler?.();
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('restores the update banner when reload does not unload the page', async () => {
    mockRegistration = {
      waiting: null,
      update: vi.fn(),
      addEventListener: vi.fn(),
    } as unknown as globalThis.ServiceWorkerRegistration;

    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRegistration
    );

    const { result } = await renderReadyHook();

    vi.useFakeTimers();
    act(() => {
      result.current.update();
    });

    act(() => {
      vi.advanceTimersByTime(RELOAD_RECOVERY_MS);
    });

    expect(reloadMock).toHaveBeenCalled();
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.updateAvailable).toBe(true);
  });

  it('ignores duplicate update clicks while refreshing', async () => {
    const { result } = await renderReadyHook();

    act(() => {
      result.current.update();
    });

    act(() => {
      result.current.update();
    });

    expect(postMessageMock).toHaveBeenCalledTimes(1);
  });
});
