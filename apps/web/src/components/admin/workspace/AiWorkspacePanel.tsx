'use client';

import { useCallback, useState } from 'react';
import { useFeature, useI18n, type OrderListItem, type ProductListItem } from '@mobazha/core';
import { Sparkles } from 'lucide-react';
import { AIChatPanel } from '@/components/AIChatPanel';
import { useProductLicensePoolHints } from '@/hooks/useProductLicensePoolHints';
import { useSellerSupplySummaries } from '@/hooks/useSellerSupplySummaries';
import { useSyncedListingProviders } from '@/hooks/useSyncedListingProviders';
import { AiWorkspaceSetupBanner } from './AiWorkspaceSetupBanner';
import { AiWorkspaceStatusBadge } from './AiWorkspaceStatusBadge';
import { WorkspaceOpportunityCards } from './WorkspaceOpportunityCards';
import { WorkspacePendingApprovals } from './WorkspacePendingApprovals';
import { useAiWorkspaceStatus } from './useAiWorkspaceStatus';
import { useWorkspaceOpportunities } from './useWorkspaceOpportunities';

interface AiWorkspacePanelProps {
  orders: OrderListItem[];
  products: ProductListItem[];
  ordersLoading: boolean;
  productsLoading: boolean;
  hasNoPaymentMethods: boolean;
  isPrivateStore: boolean;
}

export function AiWorkspacePanel({
  orders,
  products,
  ordersLoading,
  productsLoading,
  hasNoPaymentMethods,
  isPrivateStore,
}: AiWorkspacePanelProps) {
  const { t } = useI18n();
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null);
  const { available: aiAvailable, loading: aiStatusLoading, status } = useAiWorkspaceStatus();
  const supplyAvailabilityEnabled = useFeature('supplyAvailabilityEnabled');
  const { getProvider } = useSyncedListingProviders();
  const { getHint } = useProductLicensePoolHints(products, 0, supplyAvailabilityEnabled);
  const { getSummary, loading: summaryLoading } = useSellerSupplySummaries(
    products,
    0,
    supplyAvailabilityEnabled
  );

  const supplyContextFor = useCallback(
    (product: ProductListItem) => {
      const summary = getSummary(product.slug);
      return {
        product,
        syncedProvider: getProvider(product.slug),
        licenseHint: getHint(product.slug),
        summary,
        summaryLoading: supplyAvailabilityEnabled && summaryLoading && !summary,
      };
    },
    [getProvider, getHint, getSummary, supplyAvailabilityEnabled, summaryLoading]
  );

  const opportunities = useWorkspaceOpportunities({
    orders,
    products,
    hasNoPaymentMethods,
    isPrivateStore,
    supplyContextFor,
    includeAskAiCard: aiAvailable,
  });

  const handleChatAction = useCallback((prompt: string) => {
    setSeedPrompt(prompt);
  }, []);

  const cardsLoading = ordersLoading || productsLoading;

  return (
    <div className="space-y-6" data-testid="admin-ai-workspace">
      {!aiStatusLoading && !aiAvailable && <AiWorkspaceSetupBanner />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('admin.workspace.subtitle')}</p>
        {(aiStatusLoading || aiAvailable) && (
          <AiWorkspaceStatusBadge status={status} loading={aiStatusLoading} />
        )}
      </div>

      {aiAvailable && (
        <>
          <WorkspacePendingApprovals />
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{t('admin.workspace.valueSummary')}</p>
          </div>
        </>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6 lg:items-start">
        <section className={!aiAvailable ? 'opacity-80' : undefined}>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {t('admin.workspace.opportunitiesTitle')}
          </h3>
          {cardsLoading ? (
            <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
          ) : (
            <WorkspaceOpportunityCards items={opportunities} onChatAction={handleChatAction} />
          )}
        </section>

        <section className="lg:sticky lg:top-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {t('admin.workspace.chatTitle')}
          </h3>
          <AIChatPanel
            variant="inline"
            seedPrompt={seedPrompt}
            onSeedPromptConsumed={() => setSeedPrompt(null)}
            aiAvailable={aiAvailable}
            aiStatusLoading={aiStatusLoading}
            setupPromptVariant="minimal"
          />
        </section>
      </div>
    </div>
  );
}
