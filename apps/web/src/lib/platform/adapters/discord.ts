'use client';

import type { PlatformCapabilities } from '../types';
import { createWebAdapter } from './web';

/**
 * MVP-1 — Discord Activity adapter (stub).
 *
 * For now we reuse the Web adapter wholesale. When Discord Activity rolls in
 * (post-MVP), this file is where `@discord/embedded-app-sdk` integration
 * would land — specifically:
 *   - primaryCTA → Discord activity command bar (if/when available)
 *   - backAction → close-activity semantics
 *   - share      → Discord message compose pre-fill
 *
 * Today, returning the Web adapter means a Discord-embedded session behaves
 * the same as a standalone Web session: page-local CTAs, browser-style back,
 * `navigator.share` for invites. No regressions vs. status quo.
 */
export function createDiscordAdapter(): PlatformCapabilities {
  const base = createWebAdapter();
  return {
    ...base,
    channel: 'discord',
  };
}
