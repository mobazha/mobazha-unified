'use client';

import { useCallback, useState } from 'react';
import { useFeature, useI18n, type OrderListItem, type ProductListItem } from '@mobazha/core';
import { AIChatPanel } from '@/components/AIChatPanel';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useProductLicensePoolHints } from '@/hooks/useProductLicensePoolHints';
import { useSellerSupplySummaries } from '@/hooks/useSellerSupplySummaries';
import { useSyncedListingProviders } from '@/hooks/useSyncedListingProviders';
import { AiWorkspaceSetupBanner } from './AiWorkspaceSetupBanner';
import { AiWorkspaceStatusBadge } from './AiWorkspaceStatusBadge';
import { WorkspaceImportRunBanner, rememberWorkspaceImportRun } from './WorkspaceImportRunBanner';
import { WorkspaceLayoutControls } from './WorkspaceLayoutControls';
import { WorkspaceOpportunitiesRail } from './WorkspaceOpportunityCards';
import { WorkspacePendingApprovals } from './WorkspacePendingApprovals';
import { getWorkspaceImportRunId } from './workspaceImportRunStorage';
import {
  getWorkspaceFocusMode,
  getWorkspaceRailCollapsed,
  setWorkspaceFocusMode,
  setWorkspaceRailCollapsed,
} from './workspaceLayoutStorage';
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
  const { toast } = useToast();
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null);
  const [chatContextLabel, setChatContextLabel] = useState<string | null>(null);
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | null>(null);
  const [importRunId, setImportRunId] = useState<string | null>(() => getWorkspaceImportRunId());
  const [railCollapsed, setRailCollapsed] = useState(() => getWorkspaceRailCollapsed());
  const [focusMode, setFocusMode] = useState(() => getWorkspaceFocusMode());
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
      toast({
        title: t('admin.workspace.sourceMaterialImportParsingTitle'),
        description: t('admin.workspace.sourceMaterialImportParsingDescription'),
        variant: 'success',
      });
    },
    [t, toast]
  );

  const cardsLoading = ordersLoading || productsLoading;

  const handleToggleRail = useCallback(() => {
    setRailCollapsed(prev => {
      const next = !prev;
      setWorkspaceRailCollapsed(next);
      return next;
    });
  }, []);

  const handleToggleFocus = useCallback(() => {
    setFocusMode(prev => {
      const next = !prev;
      setWorkspaceFocusMode(next);
      if (next) {
        setRailCollapsed(true);
        setWorkspaceRailCollapsed(true);
      }
      return next;
    });
  }, []);

  const showOpportunitiesRail = !focusMode && !railCollapsed;

  return (
    <div
      className="space-y-6"
      data-testid="admin-ai-workspace"
      data-workspace-focus={focusMode ? 'true' : undefined}
    >
      {!aiStatusLoading && !aiAvailable && <AiWorkspaceSetupBanner />}

      {(aiStatusLoading || aiAvailable) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="lg:hidden">
            <WorkspaceLayoutControls
              railCollapsed={railCollapsed}
              focusMode={focusMode}
              opportunityCount={opportunities.length}
              onToggleRail={handleToggleRail}
              onToggleFocus={handleToggleFocus}
              className="flex"
            />
          </div>
          <AiWorkspaceStatusBadge status={status} loading={aiStatusLoading} />
        </div>
      )}

      {aiAvailable && (
        <>
          <WorkspaceImportRunBanner runId={importRunId} onRunIdChange={setImportRunId} />
          <WorkspacePendingApprovals />
        </>
      )}

      <div
        className={cn(
          'lg:grid lg:gap-6 lg:items-start space-y-4 lg:space-y-0',
          showOpportunitiesRail
            ? 'lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]'
            : 'lg:grid-cols-1'
        )}
      >
        {showOpportunitiesRail && (
          <section className={cn(!aiAvailable && 'opacity-80', 'order-2 lg:order-1')}>
            <WorkspaceOpportunitiesRail
              items={opportunities}
              loading={cardsLoading}
              activeOpportunityId={activeOpportunityId}
              onChatAction={handleChatAction}
            />
          </section>
        )}

        <section
          className={cn('order-1 lg:order-2 min-h-0 w-full', !focusMode && 'lg:sticky lg:top-4')}
          id="workspace-chat-panel"
        >
          <div className="mb-3 hidden lg:flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t('admin.workspace.chatTitle')}
            </h3>
            <WorkspaceLayoutControls
              railCollapsed={railCollapsed}
              focusMode={focusMode}
              opportunityCount={opportunities.length}
              onToggleRail={handleToggleRail}
              onToggleFocus={handleToggleFocus}
            />
          </div>
          <AIChatPanel
            variant="inline"
            seedPrompt={seedPrompt}
            onSeedPromptConsumed={() => setSeedPrompt(null)}
            aiAvailable={aiAvailable}
            aiStatusLoading={aiStatusLoading}
            setupPromptVariant="minimal"
            workspaceMode
            workspaceFocusMode={focusMode}
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
