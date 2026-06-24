'use client';

import { useMemo } from 'react';
import {
  productNeedsSupplyAttention,
  useFeature,
  getAdminStorePaymentsPath,
  type OrderListItem,
  type ProductListItem,
} from '@mobazha/core';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, ClipboardCheck, Eye, Package, Sparkles, Truck, Wallet } from 'lucide-react';

export type WorkspaceOpportunityAction = 'navigate' | 'chat';

export interface WorkspaceOpportunity {
  id: string;
  priority: 0 | 1 | 2;
  labelKey: string;
  descriptionKey?: string;
  href?: string;
  icon: LucideIcon;
  action: WorkspaceOpportunityAction;
  chatPromptKey?: string;
  count?: number;
}

interface UseWorkspaceOpportunitiesParams {
  orders: OrderListItem[];
  products: ProductListItem[];
  hasNoPaymentMethods: boolean;
  isPrivateStore: boolean;
  supplyContextFor?: (product: ProductListItem) => object;
  includeAskAiCard?: boolean;
}

function countByStates(orders: OrderListItem[], states: string[]): number {
  const set = new Set(states);
  return orders.filter(o => set.has(o.state)).length;
}

export function useWorkspaceOpportunities({
  orders,
  products,
  hasNoPaymentMethods,
  isPrivateStore,
  supplyContextFor,
  includeAskAiCard = false,
}: UseWorkspaceOpportunitiesParams): WorkspaceOpportunity[] {
  const supplyAvailabilityEnabled = useFeature('supplyAvailabilityEnabled');

  return useMemo(() => {
    const items: WorkspaceOpportunity[] = [];

    if (hasNoPaymentMethods) {
      items.push({
        id: 'no-payment',
        priority: 0,
        labelKey: 'admin.workspace.cardNoPayments',
        descriptionKey: 'admin.workspace.cardNoPaymentsDesc',
        href: getAdminStorePaymentsPath(),
        icon: Wallet,
        action: 'navigate',
      });
    }

    const pending = countByStates(orders, ['PENDING']);
    if (pending > 0) {
      items.push({
        id: 'pending-orders',
        priority: 1,
        labelKey: 'admin.dashboard.actionPendingReview',
        href: '/admin/orders?status=pending',
        icon: ClipboardCheck,
        action: 'navigate',
        count: pending,
      });
    }

    const toFulfill = countByStates(orders, ['AWAITING_SHIPMENT']);
    if (toFulfill > 0) {
      items.push({
        id: 'fulfill-orders',
        priority: 1,
        labelKey: 'admin.dashboard.actionToFulfill',
        href: '/admin/orders?status=processing',
        icon: Truck,
        action: 'navigate',
        count: toFulfill,
      });
    }

    const disputed = countByStates(orders, ['DISPUTED']);
    if (disputed > 0) {
      items.push({
        id: 'disputed-orders',
        priority: 0,
        labelKey: 'admin.dashboard.actionDisputed',
        href: '/admin/orders?status=disputed',
        icon: AlertTriangle,
        action: 'navigate',
        count: disputed,
      });
    }

    if (supplyAvailabilityEnabled && supplyContextFor) {
      const lowSupplyCount = products.filter(p =>
        productNeedsSupplyAttention(
          supplyContextFor(p) as Parameters<typeof productNeedsSupplyAttention>[0]
        )
      ).length;
      if (lowSupplyCount > 0) {
        items.push({
          id: 'supply-attention',
          priority: 0,
          labelKey: 'admin.dashboard.supplyNeedsAttentionTitle',
          descriptionKey: 'admin.dashboard.supplyNeedsAttentionCount',
          href: '/admin/products?supply=needs_attention',
          icon: Package,
          action: 'navigate',
          count: lowSupplyCount,
        });
      }
    }

    if (products.length === 0) {
      items.push({
        id: 'no-products',
        priority: 1,
        labelKey: 'admin.workspace.cardNoProducts',
        descriptionKey: 'admin.workspace.cardNoProductsDesc',
        href: '/listing/new?from=admin',
        icon: Package,
        action: 'navigate',
      });
    }

    if (isPrivateStore) {
      items.push({
        id: 'private-store',
        priority: 2,
        labelKey: 'admin.dashboard.privateStoreActive',
        descriptionKey: 'admin.dashboard.privateStoreActiveDesc',
        href: '/admin/settings/access-control/privacy',
        icon: Eye,
        action: 'navigate',
      });
    }

    if (includeAskAiCard && products.length > 0) {
      items.push({
        id: 'ask-ai',
        priority: 2,
        labelKey: 'admin.workspace.cardAskAi',
        descriptionKey: 'admin.workspace.cardAskAiDesc',
        icon: Sparkles,
        action: 'chat',
        chatPromptKey: 'admin.workspace.cardAskAiPrompt',
      });
    }

    return items.sort((a, b) => a.priority - b.priority);
  }, [
    orders,
    products,
    hasNoPaymentMethods,
    isPrivateStore,
    supplyAvailabilityEnabled,
    supplyContextFor,
    includeAskAiCard,
  ]);
}
