// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { TranslationResource } from '../../types';

/** Locale overlay for extended payment rails. */
export const commercialEsOverlay: Partial<TranslationResource> = {
  standalone: {
    setup: {
      completeDesc:
        'Configura tu billetera Monero a continuación para empezar a aceptar pedidos en XMR.',
    },
  },
  admin: {
    onboarding: {
      setupMoneroWallet: 'Configurar billetera Monero',
      setupMoneroWalletDesc: 'Crea o restaura la billetera XMR local de esta tienda',
    },
  },
};
