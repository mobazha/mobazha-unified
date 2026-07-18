// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { TranslationResource } from '../../types';

/** Locale overlay for extended payment rails. */
export const commercialFrOverlay: Partial<TranslationResource> = {
  standalone: {
    setup: {
      completeDesc:
        'Configurez ensuite votre portefeuille Monero pour commencer à accepter les commandes en XMR.',
    },
  },
  admin: {
    onboarding: {
      setupMoneroWallet: 'Configurer le portefeuille Monero',
      setupMoneroWalletDesc: 'Créez ou restaurez le portefeuille XMR local de cette boutique',
    },
  },
};
