'use client';

import { useCallback, useState } from 'react';
import { useFeature, useI18n, type OrderListItem, type ProductListItem } from '@mobazha/core';
import { AIChatPanel } from '@/components/AIChatPanel';
import { useProductLicensePoolHints } from '@/hooks/useProductLicensePoolHints';
import { useSellerSupplySummaries } from '@/hooks/useSellerSupplySummaries';
import { useSyncedListingProviders } from '@/hooks/useSyncedListingProviders';
import { AiWorkspaceSetupBanner } from './AiWorkspaceSetupBanner';
import { AiWorkspaceStatusBadge } from './AiWorkspaceStatusBadge';
import { WorkspaceImportRunBanner, rememberWorkspaceImportRun } from './WorkspaceImportRunBanner';
import { WorkspaceOpportunitiesRail } from './WorkspaceOpportunityCards';
import { WorkspacePendingApprovals } from './WorkspacePendingApprovals';
import { getWorkspaceImportRunId } from './workspaceImportRunStorage';
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
  const [chatContextLabel, setChatContextLabel] = useState<string | null>(null);
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | null>(null);
  const [importRunId, setImportRunId] = useState<string | null>(() => getWorkspaceImportRunId());
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
    includeAskAiCard: false,
  });

  const handleChatAction = useCallback(
    (prompt: string, contextLabel: string, opportunityId: string) => {
      setActiveOpportunityId(opportunityId);
      setChatContextLabel(contextLabel);
      setSeedPrompt(prompt);
    },
    []
  );

  const handleImportComplete = useCallback(
    (runId: string) => {
      rememberWorkspaceImportRun(runId, setImportRunId);
      setChatContextLabel(t('admin.workspace.importRunTaskTitle'));
      setActiveOpportunityId('product-import');
    },
    [t]
  );

  const cardsLoading = ordersLoading || productsLoading;

  return (
    <div className="space-y-6" data-testid="admin-ai-workspace">
      {!aiStatusLoading && !aiAvailable && <AiWorkspaceSetupBanner />}

      {(aiStatusLoading || aiAvailable) && (
        <div className="flex justify-end">
          <AiWorkspaceStatusBadge status={status} loading={aiStatusLoading} />
        </div>
      )}

      {aiAvailable && (
        <>
          <WorkspaceImportRunBanner runId={importRunId} onRunIdChange={setImportRunId} />
          <WorkspacePendingApprovals />
        </>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
        <section className={!aiAvailable ? 'opacity-80' : undefined}>
          <WorkspaceOpportunitiesRail
            items={opportunities}
            loading={cardsLoading}
            activeOpportunityId={activeOpportunityId}
            onChatAction={handleChatAction}
          />
        </section>

        <section className="lg:sticky lg:top-4" id="workspace-chat-panel">
          <h3 className="text-sm font-semibold text-foreground mb-3 hidden lg:block">
            {t('admin.workspace.chatTitle')}
          </h3>
          <AIChatPanel
            variant="inline"
            seedPrompt={seedPrompt}
            onSeedPromptConsumed={() => setSeedPrompt(null)}
            aiAvailable={aiAvailable}
            aiStatusLoading={aiStatusLoading}
            setupPromptVariant="minimal"
            workspaceMode
            chatContextLabel={chatContextLabel}
            onChatContextDismiss={() => {
              setChatContextLabel(null);
              setActiveOpportunityId(null);
            }}
            onImportComplete={handleImportComplete}
          />
        </section>
      </div>
    </div>
  );
}
