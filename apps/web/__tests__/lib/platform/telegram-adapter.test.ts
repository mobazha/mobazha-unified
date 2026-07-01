import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTelegramAdapter,
  type TGWebAppLike,
  type TGMainButtonLike,
  type TGBackButtonLike,
  type TGHapticLike,
} from '@/lib/platform/adapters/telegram';

// --- SDK mock factory ------------------------------------------------------

function mockMainButton(): TGMainButtonLike & { _state: Record<string, unknown> } {
  const state: Record<string, unknown> = {
    visible: false,
    enabled: true,
    progress: false,
    text: '',
    listeners: [],
  };
  return {
    _state: state,
    setText: vi.fn((t: string) => {
      state.text = t;
    }),
    onClick: vi.fn((cb: () => void) => {
      (state.listeners as Array<() => void>).push(cb);
    }),
    offClick: vi.fn((cb: () => void) => {
      const arr = state.listeners as Array<() => void>;
      const idx = arr.indexOf(cb);
      if (idx >= 0) arr.splice(idx, 1);
    }),
    show: vi.fn(() => {
      state.visible = true;
    }),
    hide: vi.fn(() => {
      state.visible = false;
    }),
    enable: vi.fn(() => {
      state.enabled = true;
    }),
    disable: vi.fn(() => {
      state.enabled = false;
    }),
    showProgress: vi.fn(() => {
      state.progress = true;
    }),
    hideProgress: vi.fn(() => {
      state.progress = false;
    }),
  };
}

function mockBackButton(): TGBackButtonLike & { _state: Record<string, unknown> } {
  const state: Record<string, unknown> = { visible: false, listeners: [] };
  return {
    _state: state,
    onClick: vi.fn((cb: () => void) => {
      (state.listeners as Array<() => void>).push(cb);
    }),
    offClick: vi.fn((cb: () => void) => {
      const arr = state.listeners as Array<() => void>;
      const idx = arr.indexOf(cb);
      if (idx >= 0) arr.splice(idx, 1);
    }),
    show: vi.fn(() => {
      state.visible = true;
    }),
    hide: vi.fn(() => {
      state.visible = false;
    }),
  };
}

function mockHaptic(): TGHapticLike {
  return {
    impactOccurred: vi.fn(),
    notificationOccurred: vi.fn(),
    selectionChanged: vi.fn(),
  };
}

function mockSdk(overrides: Partial<TGWebAppLike> = {}): TGWebAppLike {
  return {
    MainButton: mockMainButton(),
    BackButton: mockBackButton(),
    HapticFeedback: mockHaptic(),
    showConfirm: vi.fn((_msg, cb) => cb?.(true)),
    showAlert: vi.fn((_msg, cb) => cb?.()),
    openTelegramLink: vi.fn(),
    ...overrides,
  };
}

describe('TelegramAdapter', () => {
  describe('factory', () => {
    it('throws when MainButton is missing', () => {
      expect(() => createTelegramAdapter({ BackButton: mockBackButton() })).toThrow(
        /SDK is missing/
      );
    });
    it('throws when BackButton is missing', () => {
      expect(() => createTelegramAdapter({ MainButton: mockMainButton() })).toThrow(
        /SDK is missing/
      );
    });
  });

  describe('primaryCTA', () => {
    let sdk: ReturnType<typeof mockSdk>;
    let mb: ReturnType<typeof mockMainButton>;
    beforeEach(() => {
      mb = mockMainButton();
      sdk = mockSdk({ MainButton: mb });
    });

    it('isNative is true', () => {
      const a = createTelegramAdapter(sdk);
      expect(a.primaryCTA.isNative).toBe(true);
    });

    it('setText(text) shows button, setText(undefined) hides', () => {
      const a = createTelegramAdapter(sdk);
      a.primaryCTA.setText('Buy');
      expect(mb.setText).toHaveBeenCalledWith('Buy');
      expect(mb.show).toHaveBeenCalled();
      expect((mb._state.listeners as unknown[]).length).toBe(1);
      a.primaryCTA.setText(undefined);
      expect(mb.hide).toHaveBeenCalled();
      expect((mb._state.listeners as unknown[]).length).toBe(0);
    });

    it('keeps exactly one click subscription across multiple setOnClick calls', () => {
      const a = createTelegramAdapter(sdk);
      a.primaryCTA.setText('A');
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      a.primaryCTA.setOnClick(cb1);
      a.primaryCTA.setOnClick(cb2);
      // onClick only called once by the adapter (during setText).
      expect(mb.onClick).toHaveBeenCalledTimes(1);
      // Simulate user tap — should only invoke the *latest* onClick ref.
      const listeners = mb._state.listeners as Array<() => void>;
      listeners[0]();
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('setLoading / setDisabled drive progress / disable', () => {
      const a = createTelegramAdapter(sdk);
      a.primaryCTA.setText('X');
      a.primaryCTA.setLoading(true);
      expect(mb.showProgress).toHaveBeenCalled();
      a.primaryCTA.setLoading(false);
      expect(mb.hideProgress).toHaveBeenCalled();
      a.primaryCTA.setDisabled(true);
      expect(mb.disable).toHaveBeenCalled();
      a.primaryCTA.setDisabled(false);
      expect(mb.enable).toHaveBeenCalled();
    });

    it('destroy removes click and hides', () => {
      const a = createTelegramAdapter(sdk);
      a.primaryCTA.setText('X');
      a.destroy();
      expect((mb._state.listeners as unknown[]).length).toBe(0);
      expect(mb.hide).toHaveBeenCalled();
    });
  });

  describe('backAction', () => {
    it('show/hide BackButton on stack transitions', () => {
      const bb = mockBackButton();
      const sdk = mockSdk({ BackButton: bb });
      const a = createTelegramAdapter(sdk);
      expect(bb.show).not.toHaveBeenCalled();

      const r1 = a.backAction.pushHandler(() => {});
      expect(bb.show).toHaveBeenCalledTimes(1);

      const r2 = a.backAction.pushHandler(() => {});
      // Still only one show — already visible.
      expect(bb.show).toHaveBeenCalledTimes(1);

      r2();
      expect(bb.hide).not.toHaveBeenCalled();
      r1();
      expect(bb.hide).toHaveBeenCalledTimes(1);
    });

    it('BackButton click triggers top handler (LIFO)', () => {
      const bb = mockBackButton();
      const sdk = mockSdk({ BackButton: bb });
      const a = createTelegramAdapter(sdk);
      const outer = vi.fn();
      const inner = vi.fn();
      a.backAction.pushHandler(outer);
      a.backAction.pushHandler(inner);
      const listeners = bb._state.listeners as Array<() => void>;
      listeners[0]();
      expect(inner).toHaveBeenCalledTimes(1);
      expect(outer).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('resolves with SDK showConfirm result', async () => {
      const sdk = mockSdk({
        showConfirm: vi.fn((_msg, cb) => cb?.(true)),
      });
      const a = createTelegramAdapter(sdk);
      await expect(a.confirm.confirm({ message: 'ok?' })).resolves.toBe(true);
    });
  });

  describe('haptic', () => {
    it('maps success/warning/error to notificationOccurred', () => {
      const hf = mockHaptic();
      const sdk = mockSdk({ HapticFeedback: hf });
      const a = createTelegramAdapter(sdk);
      a.haptic.success();
      a.haptic.warning();
      a.haptic.error();
      expect(hf.notificationOccurred).toHaveBeenNthCalledWith(1, 'success');
      expect(hf.notificationOccurred).toHaveBeenNthCalledWith(2, 'warning');
      expect(hf.notificationOccurred).toHaveBeenNthCalledWith(3, 'error');
    });
    it('isSupported=false when SDK lacks HapticFeedback', () => {
      const sdk = mockSdk({ HapticFeedback: undefined });
      const a = createTelegramAdapter(sdk);
      expect(a.haptic.isSupported).toBe(false);
      // Still safe to call — no crash
      a.haptic.success();
    });
  });

  describe('share', () => {
    it('opens t.me/share/url with encoded params', async () => {
      const openSpy = vi.fn();
      const sdk = mockSdk({ openTelegramLink: openSpy });
      const a = createTelegramAdapter(sdk);
      await expect(a.share.share({ url: 'https://example.com/x', text: 'hi & bye' })).resolves.toBe(
        'shared'
      );
      expect(openSpy).toHaveBeenCalledTimes(1);
      const called = (openSpy.mock.calls[0] as string[])[0];
      expect(called).toContain('t.me/share/url');
      // URLSearchParams encodes via application/x-www-form-urlencoded — spaces
      // become `+`, not `%20` (c.f. encodeURIComponent). Parse the query back
      // and assert semantic equality instead of matching the raw wire format,
      // so any future swap between URLSearchParams and a manual encoder
      // wouldn't spuriously fail this test.
      const query = new URLSearchParams(called.split('?')[1] ?? '');
      expect(query.get('url')).toBe('https://example.com/x');
      expect(query.get('text')).toBe('hi & bye');
    });
    it('returns cancelled when openTelegramLink missing', async () => {
      const sdk = mockSdk({ openTelegramLink: undefined });
      const a = createTelegramAdapter(sdk);
      await expect(a.share.share({ url: 'x' })).resolves.toBe('cancelled');
    });
  });
});
