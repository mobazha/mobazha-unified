// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Translation of what sellers wrote, for the language the visitor is reading.
 *
 * Three things make this cheap enough to put in front of every card:
 *
 *   - a cache keyed by language and text, so a wording is asked for once per
 *     session and a page the visitor returns to asks for nothing;
 *   - coalescing, so a grid of twenty cards is one request rather than twenty:
 *     every caller within a few milliseconds ends up in the same batch;
 *   - a silent failure path, so a node with no engine configured — or one that
 *     cannot reach its engine — leaves the seller's words in place instead of
 *     putting an error where a product title belongs.
 */

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from './useI18n';
import {
  CONTENT_TRANSLATION_MAX_ITEMS,
  translateContent,
  type ContentTranslationItem,
} from '../services/api/translation';

/** How long to wait for more callers before asking the node. */
const COALESCE_MS = 60;

const cache = new Map<string, string>();
const listeners = new Set<() => void>();
/** language -> the texts waiting to be asked for. */
const pending = new Map<string, Map<string, true>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function cacheKey(language: string, text: string): string {
  return `${language}\u0000${text}`;
}

/**
 * Folds a locale onto the language the node is asked for: "zh-CN", "zh_TW" and
 * "zh" are one language as far as translation is concerned.
 */
export function contentLanguage(locale: string | undefined | null): string {
  const value = (locale ?? '').trim().toLowerCase().replace(/_/g, '-');
  const dash = value.indexOf('-');
  return dash > 0 ? value.slice(0, dash) : value;
}

/** The translation already held for a text, if any. */
export function cachedContentTranslation(language: string, text: string): string | undefined {
  return cache.get(cacheKey(language, text));
}

/**
 * Drops everything held. A client calls it when the node behind it changes, and
 * a test calls it to start from nothing.
 */
export function clearContentTranslationCache(): void {
  cache.clear();
  pending.clear();
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/** Queues texts that are not cached yet. Returns immediately. */
export function requestContentTranslation(language: string, texts: string[]): void {
  if (!language || texts.length === 0) return;

  let queue = pending.get(language);
  if (!queue) {
    queue = new Map<string, true>();
    pending.set(language, queue);
  }

  let added = false;
  for (const raw of texts) {
    // Whitespace is not a text: asking the node to translate it would spend a
    // request to get the same spaces back.
    const text = (raw ?? '').trim();
    if (!text || cache.has(cacheKey(language, text)) || queue.has(text)) continue;
    queue.set(text, true);
    added = true;
  }
  if (!added || flushTimer !== null) return;
  flushTimer = setTimeout(() => void flushContentTranslations(), COALESCE_MS);
}

/** Sends everything that piled up: one request per language per 40 texts. */
async function flushContentTranslations(): Promise<void> {
  flushTimer = null;

  const batches: Array<{ language: string; texts: string[] }> = [];
  for (const [language, queue] of pending) {
    const texts = Array.from(queue.keys());
    queue.clear();
    if (texts.length === 0) pending.delete(language);
    for (let index = 0; index < texts.length; index += CONTENT_TRANSLATION_MAX_ITEMS) {
      batches.push({ language, texts: texts.slice(index, index + CONTENT_TRANSLATION_MAX_ITEMS) });
    }
  }

  await Promise.all(
    batches.map(async ({ language, texts }) => {
      const items: ContentTranslationItem[] = texts.map((text, index) => ({
        id: String(index),
        text,
      }));
      try {
        const answer = await translateContent(language, items);
        let changed = false;
        for (const result of answer?.results ?? []) {
          const source = texts[Number(result.id)];
          if (!source || !result.translated || !result.text) continue;
          cache.set(cacheKey(language, source), result.text);
          changed = true;
        }
        if (changed) {
          for (const listener of listeners) listener();
        }
      } catch {
        // Translation is an improvement, not a requirement: every caller keeps
        // rendering the text it was given.
      }
    })
  );
}

/**
 * useTranslatedTexts returns the texts in the visitor's language.
 *
 * A text that has no translation yet — or that the node could not translate —
 * comes back as it was, so a caller renders it without checking anything. Pass
 * `overrideLocale` when a surface follows something other than the interface
 * language.
 */
export function useTranslatedTexts(
  texts: Array<string | undefined | null>,
  overrideLocale?: string
): Array<string | null | undefined> {
  const { locale } = useI18n();
  const language = contentLanguage(overrideLocale ?? locale);
  const key = texts.map(text => text ?? '').join('\u0000');
  const [revision, setRevision] = useState(0);

  // Every mounted caller listens for itself: one component's refresh must not
  // have to know about another's.
  useEffect(() => {
    const listener = () => setRevision(value => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Ask for what is missing. The scheduler coalesces every caller in this tick
  // into one request, which is what makes a grid of cards cost one round trip.
  useEffect(() => {
    const wanted = texts.map(text => (text ?? '').trim()).filter(Boolean);
    if (wanted.length > 0) requestContentTranslation(language, wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key covers the texts
  }, [key, language]);

  return useMemo(
    () =>
      texts.map(text => {
        if (!text) return text;
        return cache.get(cacheKey(language, text)) ?? text;
      }),
    // revision is what re-renders this caller once its batch comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, language, revision]
  );
}
