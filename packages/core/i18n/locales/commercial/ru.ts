// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { TranslationResource } from '../../types';

/** Locale overlay for extended payment rails. */
export const commercialRuOverlay: Partial<TranslationResource> = {
  standalone: {
    setup: {
      completeDesc: 'Далее настройте кошелёк Monero, чтобы начать принимать заказы в XMR.',
    },
  },
  admin: {
    onboarding: {
      setupMoneroWallet: 'Настроить кошелёк Monero',
      setupMoneroWalletDesc: 'Создайте или восстановите локальный XMR-кошелёк для этого магазина',
    },
  },
};
