// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Content translation API service.
 *
 * A product or a wanted request is written in whatever language its seller
 * speaks; the visitor reads the storefront in theirs. The node translates on
 * demand and caches what it translated, so the same wording is only ever paid
 * for once, and a text nothing could translate comes back unchanged with
 * `translated: false` — a page renders the seller's words rather than an error.
 *
 * This is a public call: a visitor browsing a store has no account, and the
 * text being translated is the seller's own published copy.
 */

import { NODE_API } from '../../config/apiPaths';
import { publicPost } from './helpers';

/** One text on its way to the node. `id` is the caller's own and comes back. */
export interface ContentTranslationItem {
  id: string;
  text: string;
  /** The language the text is written in, when the caller knows it. */
  sourceLang?: string;
}

export interface ContentTranslationResult {
  id: string;
  text: string;
  /** False when `text` is the input unchanged. */
  translated: boolean;
  /** True when the node answered from its cache. */
  cached: boolean;
  engine?: string;
}

export interface ContentTranslationResponse {
  targetLang: string;
  results: ContentTranslationResult[];
}

/** The node refuses more texts than this in one request. */
export const CONTENT_TRANSLATION_MAX_ITEMS = 40;

/** Translates every item into `targetLang`, in the order they were given. */
export async function translateContent(
  targetLang: string,
  items: ContentTranslationItem[]
): Promise<ContentTranslationResponse> {
  return publicPost<ContentTranslationResponse>(NODE_API.TRANSLATE, { targetLang, items });
}
