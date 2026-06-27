'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { WorkspaceOpportunitiesRail } from './WorkspaceOpportunityCards';
import { WorkspacePendingApprovals } from './WorkspacePendingApprovals';
import { getWorkspaceImportRunId } from './workspaceImportRunStorage';
import { getWorkspaceRailCollapsed, setWorkspaceRailCollapsed } from './workspaceLayoutStorage';
import { useWorkspaceFocus } from './workspaceFocusContext';
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
  const { focusMode, toggleFocusMode } = useWorkspaceFocus();
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
    const enteringFocus = !focusMode;
    if (enteringFocus) {
      setRailCollapsed(true);
      setWorkspaceRailCollapsed(true);
    }
    toggleFocusMode();
  }, [focusMode, toggleFocusMode]);

  const showOpportunitiesRail = !focusMode && !railCollapsed;

  useEffect(() => {
    const mainInner = document.querySelector<HTMLElement>('main [class*="max-w-7xl"]');
    if (!mainInner) return;
    if (focusMode) {
      mainInner.classList.add('!py-2', '!pb-4');
    } else {
      mainInner.classList.remove('!py-2', '!pb-4');
    }
    return () => {
      mainInner.classList.remove('!py-2', '!pb-4');
    };
  }, [focusMode]);

  return (
    <div
      className={cn('space-y-6', focusMode && 'space-y-0 -mx-4 sm:-mx-6 lg:-mx-8')}
      data-testid="admin-ai-workspace"
      data-workspace-focus={focusMode ? 'true' : undefined}
    >
      {!focusMode && !aiStatusLoading && !aiAvailable && <AiWorkspaceSetupBanner />}

      {!focusMode && (aiStatusLoading || aiAvailable) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AiWorkspaceStatusBadge status={status} loading={aiStatusLoading} />
        </div>
      )}

      {!focusMode && aiAvailable && (
        <>
          <WorkspaceImportRunBanner runId={importRunId} onRunIdChange={setImportRunId} />
          <WorkspacePendingApprovals />
        </>
      )}

      {!focusMode && (
        <div className="lg:hidden">
          <WorkspaceOpportunitiesRail
            mobileOnly
            items={opportunities}
            loading={cardsLoading}
            activeOpportunityId={activeOpportunityId}
            onChatAction={handleChatAction}
          />
        </div>
      )}

      <div
        className={cn(
          'lg:grid lg:gap-6 lg:items-start space-y-4 lg:space-y-0',
          showOpportunitiesRail
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]'
            : 'lg:grid-cols-1',
          focusMode && 'lg:gap-0 space-y-0'
        )}
      >
        <section
          className={cn(
            'min-h-0 w-full',
            !focusMode && 'lg:sticky lg:top-4',
            focusMode && 'lg:static'
          )}
          id="workspace-chat-panel"
        >
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
            workspaceLayoutControls={{
              focusMode,
              railCollapsed,
              opportunityCount: opportunities.length,
              onToggleRail: handleToggleRail,
              onToggleFocus: handleToggleFocus,
            }}
          />
        </section>

        {showOpportunitiesRail && (
          <section
            className={cn(
              !aiAvailable && 'opacity-80',
              'hidden lg:block min-h-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-16rem)] lg:overflow-y-auto'
            )}
          >
            <WorkspaceOpportunitiesRail
              desktopOnly
              items={opportunities}
              loading={cardsLoading}
              activeOpportunityId={activeOpportunityId}
              onChatAction={handleChatAction}
            />
          </section>
        )}
      </div>
    </div>
  );
}
