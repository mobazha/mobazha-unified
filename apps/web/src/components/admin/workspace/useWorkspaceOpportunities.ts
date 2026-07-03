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
import {
  AlertTriangle,
  ClipboardCheck,
  Eye,
  FileSpreadsheet,
  Package,
  Sparkles,
  Truck,
  Wallet,
} from 'lucide-react';

export type WorkspaceOpportunityAction = 'navigate' | 'chat' | 'both';

export interface WorkspaceOpportunity {
  id: string;
  priority: 0 | 1 | 2;
  tone?: 'critical' | 'warning' | 'info' | 'neutral';
  labelKey: string;
  descriptionKey?: string;
  outcomeKey?: string;
  href?: string;
  icon: LucideIcon;
  action: WorkspaceOpportunityAction;
  chatPromptKey?: string;
  actionLabelKey?: string;
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
        tone: 'critical',
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
        tone: 'info',
        labelKey: 'admin.dashboard.actionPendingReview',
        outcomeKey: 'admin.workspace.cardPendingOrdersOutcome',
        href: '/admin/orders?status=pending',
        icon: ClipboardCheck,
        action: 'both',
        chatPromptKey: 'admin.workspace.cardPendingOrdersPrompt',
        actionLabelKey: 'admin.workspace.cardActionSuggest',
        count: pending,
      });
    }

    const toFulfill = countByStates(orders, ['AWAITING_SHIPMENT']);
    if (toFulfill > 0) {
      items.push({
        id: 'fulfill-orders',
        priority: 1,
        tone: 'info',
        labelKey: 'admin.dashboard.actionToFulfill',
        outcomeKey: 'admin.workspace.cardFulfillOrdersOutcome',
        href: '/admin/orders?status=processing',
        icon: Truck,
        action: 'both',
        chatPromptKey: 'admin.workspace.cardFulfillOrdersPrompt',
        actionLabelKey: 'admin.workspace.cardActionPlan',
        count: toFulfill,
      });
    }

    const disputed = countByStates(orders, ['DISPUTED']);
    if (disputed > 0) {
      items.push({
        id: 'disputed-orders',
        priority: 0,
        tone: 'critical',
        labelKey: 'admin.dashboard.actionDisputed',
        outcomeKey: 'admin.workspace.cardDisputedOrdersOutcome',
        href: '/admin/orders?status=disputed',
        icon: AlertTriangle,
        action: 'both',
        chatPromptKey: 'admin.workspace.cardDisputedOrdersPrompt',
        actionLabelKey: 'admin.workspace.cardActionDraft',
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
          priority: 1,
          tone: 'warning',
          labelKey: 'admin.dashboard.supplyNeedsAttentionTitle',
          descriptionKey: 'admin.dashboard.supplyNeedsAttentionCount',
          outcomeKey: 'admin.workspace.cardSupplyAttentionOutcome',
          href: '/admin/products?supply=needs_attention',
          icon: Package,
          action: 'both',
          chatPromptKey: 'admin.workspace.cardSupplyAttentionPrompt',
          actionLabelKey: 'admin.workspace.cardActionPlan',
          count: lowSupplyCount,
        });
      }
    }

    if (products.length === 0) {
      items.push({
        id: 'no-products',
        priority: 1,
        tone: 'info',
        labelKey: 'admin.workspace.cardNoProducts',
        descriptionKey: 'admin.workspace.cardNoProductsDesc',
        outcomeKey: 'admin.workspace.cardNoProductsOutcome',
        href: '/admin/products/import',
        icon: Package,
        action: 'both',
        chatPromptKey: 'admin.workspace.cardNoProductsPrompt',
        actionLabelKey: 'admin.workspace.cardActionImport',
      });
    } else {
      items.push({
        id: 'product-import',
        priority: 2,
        tone: 'info',
        labelKey: 'admin.workspace.cardProductImport',
        descriptionKey: 'admin.workspace.cardProductImportDesc',
        outcomeKey: 'admin.workspace.cardProductImportOutcome',
        href: '/admin/products/import',
        icon: FileSpreadsheet,
        action: 'both',
        chatPromptKey: 'admin.workspace.quickActionImportPrompt',
        actionLabelKey: 'admin.workspace.cardActionImport',
      });
    }

    if (isPrivateStore) {
      items.push({
        id: 'private-store',
        priority: 2,
        tone: 'neutral',
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
        tone: 'neutral',
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
