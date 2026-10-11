// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cachedContentTranslation,
  clearContentTranslationCache,
  contentLanguage,
  requestContentTranslation,
} from '../../hooks/useContentTranslation';

// The scheduler is what makes putting translation in front of every card
// affordable, so what it does is what these tests describe: one request per
// burst of callers, nothing asked for twice, and a failure that costs nothing.
const translateContent = vi.fn();

vi.mock('../../services/api/translation', () => ({
  CONTENT_TRANSLATION_MAX_ITEMS: 40,
  translateContent: (...args: unknown[]) => translateContent(...args),
}));

/** Lets the scheduler's timer fire and its promise chain settle. */
async function flush(): Promise<void> {
  vi.advanceTimersByTime(100);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('useContentTranslation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    translateContent.mockReset();
    clearContentTranslationCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('folds a locale onto its language', () => {
    expect(contentLanguage('zh-CN')).toBe('zh');
    expect(contentLanguage('pt_BR')).toBe('pt');
    expect(contentLanguage('en')).toBe('en');
    expect(contentLanguage(undefined)).toBe('');
  });

  it('asks for everything a burst of callers wants in one request', async () => {
    translateContent.mockImplementation(async (targetLang: string, items: Array<{ id: string; text: string }>) => ({
      targetLang,
      results: items.map(item => ({
        id: item.id,
        text: `[${targetLang}] ${item.text}`,
        translated: true,
        cached: false,
      })),
    }));

    // Three cards mounting in the same tick, as a grid does.
    requestContentTranslation('ja', ['Turntable']);
    requestContentTranslation('ja', ['Beanie']);
    requestContentTranslation('ja', ['Turntable']);
    await flush();

    expect(translateContent).toHaveBeenCalledTimes(1);
    const [, items] = translateContent.mock.calls[0];
    expect(items.map((item: { text: string }) => item.text).sort()).toEqual(['Beanie', 'Turntable']);
    expect(cachedContentTranslation('ja', 'Turntable')).toBe('[ja] Turntable');
    expect(cachedContentTranslation('ja', 'Beanie')).toBe('[ja] Beanie');
  });

  it('never asks for a wording it already has', async () => {
    translateContent.mockResolvedValue({
      targetLang: 'ja',
      results: [{ id: '0', text: '唱盘', translated: true, cached: false }],
    });

    requestContentTranslation('ja', ['Turntable']);
    await flush();
    expect(translateContent).toHaveBeenCalledTimes(1);

    requestContentTranslation('ja', ['Turntable']);
    await flush();
    expect(translateContent).toHaveBeenCalledTimes(1);
    expect(cachedContentTranslation('ja', 'Turntable')).toBe('唱盘');
  });

  it('keeps a language apart from another', async () => {
    translateContent.mockImplementation(async (targetLang: string, items: Array<{ id: string; text: string }>) => ({
      targetLang,
      results: items.map(item => ({
        id: item.id,
        text: `${targetLang}:${item.text}`,
        translated: true,
        cached: false,
      })),
    }));

    requestContentTranslation('ja', ['Turntable']);
    requestContentTranslation('zh', ['Turntable']);
    await flush();

    expect(cachedContentTranslation('ja', 'Turntable')).toBe('ja:Turntable');
    expect(cachedContentTranslation('zh', 'Turntable')).toBe('zh:Turntable');
  });

  it('costs nothing when the node cannot translate', async () => {
    translateContent.mockRejectedValue(new Error('no engine'));

    requestContentTranslation('ja', ['Turntable']);
    await flush();

    expect(cachedContentTranslation('ja', 'Turntable')).toBeUndefined();
    // The caller renders the text it was given; a later page tries again.
    requestContentTranslation('ja', ['Turntable']);
    await flush();
    expect(translateContent).toHaveBeenCalledTimes(2);
  });

  it('ignores an empty language or an empty text', async () => {
    requestContentTranslation('', ['Turntable']);
    requestContentTranslation('ja', []);
    requestContentTranslation('ja', ['   ']);
    await flush();
    expect(translateContent).not.toHaveBeenCalled();
  });
});
