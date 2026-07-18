// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { TranslationResource } from '../../types';

/** Locale overlay for extended payment rails. */
export const commercialJaOverlay: Partial<TranslationResource> = {
  standalone: {
    setup: {
      completeDesc: '次に Monero ウォレットを設定して、XMR 注文の受付を開始しましょう。',
    },
  },
  admin: {
    onboarding: {
      setupMoneroWallet: 'Monero ウォレットを設定',
      setupMoneroWalletDesc: 'このストア用のローカル XMR ウォレットを作成または復元します',
    },
  },
};
