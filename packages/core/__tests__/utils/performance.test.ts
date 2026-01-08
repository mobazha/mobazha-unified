/**
 * 性能工具函数测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  debounce,
  throttle,
  memoize,
  batchProcess,
  withTimeout,
  retry,
} from '../../utils/performance';

describe('performance utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('应在指定时间后执行函数', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('多次调用应只执行最后一次', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应传递正确的参数', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('throttle', () => {
    it('应立即执行第一次调用', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('在限制时间内应忽略后续调用', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('限制时间后应允许再次调用', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      vi.advanceTimersByTime(100);
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('memoize', () => {
    it('应缓存函数结果', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoizedFn = memoize(fn);

      expect(memoizedFn(5)).toBe(10);
      expect(memoizedFn(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('不同参数应重新计算', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoizedFn = memoize(fn);

      memoizedFn(5);
      memoizedFn(10);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应支持自定义键解析器', () => {
      const fn = vi.fn((obj: { id: number }) => obj.id * 2);
      const memoizedFn = memoize(fn, obj => String(obj.id));

      memoizedFn({ id: 1 });
      memoizedFn({ id: 1 });

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('batchProcess', () => {
    it('应分批处理数组', async () => {
      vi.useRealTimers();
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn((x: number) => x * 2);

      const results = await batchProcess(items, processor, 2);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processor).toHaveBeenCalledTimes(5);
    });
  });

  describe('withTimeout', () => {
    it('应在超时前返回结果', async () => {
      vi.useRealTimers();
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('超时应抛出错误', async () => {
      vi.useRealTimers();
      const promise = new Promise(resolve => setTimeout(() => resolve('success'), 2000));

      await expect(withTimeout(promise, 100)).rejects.toThrow('Timeout');
    });
  });

  describe('retry', () => {
    it('成功时应返回结果', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retry(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('失败后应重试', async () => {
      vi.useRealTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await retry(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('重试次数用尽应抛出最后的错误', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));

      await expect(retry(fn, 3, 10)).rejects.toThrow('always fail');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
