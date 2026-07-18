// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { TranslationResource } from '../../types';

/** Locale overlay for extended payment rails. */
export const commercialDeOverlay: Partial<TranslationResource> = {
  standalone: {
    setup: {
      completeDesc:
        'Richten Sie als Nächstes Ihre Monero-Wallet ein, um XMR-Bestellungen anzunehmen.',
    },
  },
  admin: {
    onboarding: {
      setupMoneroWallet: 'Monero-Wallet einrichten',
      setupMoneroWalletDesc:
        'Erstellen oder stellen Sie die lokale XMR-Wallet für diesen Shop wieder her',
    },
  },
};
