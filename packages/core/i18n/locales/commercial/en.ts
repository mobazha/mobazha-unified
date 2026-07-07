// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { TranslationResource } from '../../types';

/** Locale overlay for extended payment rails. */
export const commercialEnOverlay: Partial<TranslationResource> = {
  standalone: {
    setup: {
      completeDesc: 'Set up your Monero wallet next to start accepting XMR orders.',
    },
  },
  admin: {
    onboarding: {
      setupMoneroWallet: 'Set up Monero wallet',
      setupMoneroWalletDesc: 'Create or restore the local XMR wallet for this store',
    },
  },
};
