// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { TranslationResource } from '../../types';

/** Locale overlay for extended payment rails. */
export const commercialPtOverlay: Partial<TranslationResource> = {
  standalone: {
    setup: {
      completeDesc:
        'Em seguida, configure sua carteira Monero para começar a aceitar pedidos em XMR.',
    },
  },
  admin: {
    onboarding: {
      setupMoneroWallet: 'Configurar carteira Monero',
      setupMoneroWalletDesc: 'Crie ou restaure a carteira XMR local desta loja',
    },
  },
};
