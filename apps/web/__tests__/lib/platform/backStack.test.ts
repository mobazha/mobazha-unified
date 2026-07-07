import { describe, it, expect, vi } from 'vitest';
import { BackActionStack } from '@/lib/platform';

describe('BackActionStack (G1 LIFO)', () => {
  it('trigger returns false when empty', () => {
    const s = new BackActionStack();
    expect(s.hasHandler).toBe(false);
    expect(s.trigger()).toBe(false);
    expect(s.size).toBe(0);
  });

  it('push / trigger / pop one handler', () => {
    const s = new BackActionStack();
    const fn = vi.fn();
    const release = s.push(fn);
    expect(s.size).toBe(1);
    expect(s.hasHandler).toBe(true);
    expect(s.trigger()).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    release();
    expect(s.size).toBe(0);
    expect(s.hasHandler).toBe(false);
    expect(s.trigger()).toBe(false);
  });

  it('LIFO — top handler wins and does not bubble', () => {
    const s = new BackActionStack();
    const outer = vi.fn();
    const inner = vi.fn();
    const releaseOuter = s.push(outer);
    const releaseInner = s.push(inner);
    s.trigger();
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
    releaseInner();
    s.trigger();
    expect(outer).toHaveBeenCalledTimes(1);
    releaseOuter();
  });

  it('release is idempotent (Strict-Mode safe)', () => {
    const s = new BackActionStack();
    const fn = vi.fn();
    const release = s.push(fn);
    release();
    release();
    expect(s.size).toBe(0);
  });

  it('same handler pushed twice pops only one layer at a time', () => {
    const s = new BackActionStack();
    const fn = vi.fn();
    const r1 = s.push(fn);
    const r2 = s.push(fn);
    expect(s.size).toBe(2);
    r2();
    expect(s.size).toBe(1);
    r1();
    expect(s.size).toBe(0);
  });

  it('notifies observers on subscribe and empty ↔ non-empty transitions', () => {
    const s = new BackActionStack();
    const observer = vi.fn();
    s.subscribe(observer);
    expect(observer).toHaveBeenNthCalledWith(1, false);

    const r1 = s.push(() => {});
    expect(observer).toHaveBeenNthCalledWith(2, true);

    const r2 = s.push(() => {});
    // No additional notification for push when already non-empty.
    expect(observer).toHaveBeenCalledTimes(2);

    r2();
    expect(observer).toHaveBeenCalledTimes(2);

    r1();
    expect(observer).toHaveBeenNthCalledWith(3, false);
  });

  it('handler exception does not poison the stack', () => {
    const s = new BackActionStack();
    const fn = vi.fn(() => {
      throw new Error('boom');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    s.push(fn);
    expect(() => s.trigger()).not.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
