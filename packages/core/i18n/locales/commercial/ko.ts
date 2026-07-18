// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { TranslationResource } from '../../types';

/** Locale overlay for extended payment rails. */
export const commercialKoOverlay: Partial<TranslationResource> = {
  standalone: {
    setup: {
      completeDesc: '다음으로 Monero 지갑을 설정하여 XMR 주문을 받기 시작하세요.',
    },
  },
  admin: {
    onboarding: {
      setupMoneroWallet: 'Monero 지갑 설정',
      setupMoneroWalletDesc: '이 스토어의 로컬 XMR 지갑을 생성하거나 복원합니다',
    },
  },
};
