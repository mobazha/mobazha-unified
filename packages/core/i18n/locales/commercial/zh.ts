// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { TranslationResource } from '../../types';

/** Locale overlay for extended payment rails. */
export const commercialZhOverlay: Partial<TranslationResource> = {
  standalone: {
    setup: {
      completeDesc: '下一步设置门罗币钱包，即可开始接收 XMR 订单。',
    },
  },
  admin: {
    onboarding: {
      setupMoneroWallet: '设置门罗币钱包',
      setupMoneroWalletDesc: '为本店铺创建或恢复本地 XMR 钱包',
    },
  },
};
