// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  classifyStoreCredentialDenial,
  useI18n,
  type StoreCredentialDenialAction,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

export interface StoreCredentialNoticeProps {
  /** The thrown value to classify. Not a recognized denial → renders `fallback`. */
  error: unknown;
  className?: string;
  /** Rendered when `error` is not a recognized store-credential denial. */
  fallback?: React.ReactNode;
  /**
   * Re-register the store's OWN signed credential via the local node, then
   * reload (STORE_CREDENTIAL_INVALID). Never an OAuth flow.
   */
  onRefreshCredential?: () => void;
  /** Switch to a different platform account via OAuth (ACCOUNT_STORE_MISMATCH). */
  onSwitchAccount?: () => void;
  /**
   * Disconnect this store's optional platform-account association locally
   * (ACCOUNT_STORE_MISMATCH). Invoked only after the user confirms the dedicated
   * confirmation dialog — clicking the disconnect button just opens that dialog.
   */
  onDisconnect?: () => void;
  /** Connect a platform account for this feature (ACCOUNT_SESSION_REQUIRED). */
  onConnect?: () => void;
  /** Plain reload/retry of the resource (RATE_LIMITED). */
  onRetry?: () => void;
  /** Which action is in flight: that button spins and all buttons disable. */
  busyAction?: StoreCredentialDenialAction | null;
  /**
   * Which action last failed. Renders that action's localized failure copy — a
   * raw server / OAuth string is never surfaced here.
   */
  failedAction?: StoreCredentialDenialAction | null;
}

interface ActionCopy {
  /** i18n key for the resting button label. */
  labelKey: string;
  /** i18n key for the in-flight (spinner) label. */
  busyKey: string;
  /** i18n key for the localized failure message. */
  failedKey: string;
}

const ACTION_COPY: Record<StoreCredentialDenialAction, ActionCopy> = {
  refreshCredential: {
    labelKey: 'storeCredential.reconnectCta',
    busyKey: 'storeCredential.reconnecting',
    failedKey: 'storeCredential.refreshFailed',
  },
  switchAccount: {
    labelKey: 'storeCredential.accountStoreMismatchSwitch',
    busyKey: 'storeCredential.connecting',
    failedKey: 'storeCredential.connectActionFailed',
  },
  disconnect: {
    labelKey: 'storeCredential.accountStoreMismatchDisconnect',
    busyKey: 'storeCredential.disconnecting',
    failedKey: 'storeCredential.disconnectFailed',
  },
  connect: {
    labelKey: 'storeCredential.accountSessionRequiredCta',
    busyKey: 'storeCredential.connecting',
    failedKey: 'storeCredential.connectActionFailed',
  },
  retry: {
    labelKey: 'storeCredential.retryCta',
    busyKey: 'storeCredential.retryCta',
    failedKey: 'storeCredential.actionFailed',
  },
};

/**
 * Renders the localized, honest recovery state for a typed store-credential /
 * platform-account denial from the hosting backend. It is purely presentational
 * — classification lives in `@mobazha/core`, and every affordance is optional so
 * a surface only offers the actions it can actually wire (the body copy always
 * carries the full guidance, including any offer a surface chooses not to
 * button).
 *
 * `STORE_CREDENTIAL_INVALID` offers only `refreshCredential`: the local node
 * re-registers the store's OWN signed credential — never an OAuth flow, never a
 * platform account. `ACCOUNT_STORE_MISMATCH` offers switch-account (OAuth) and
 * disconnect (local); `ACCOUNT_SESSION_REQUIRED` offers connect (OAuth).
 *
 * Returns `fallback` (default `null`) when the error is not a recognized denial,
 * so callers keep their generic error UI for everything else.
 */
export function StoreCredentialNotice({
  error,
  className,
  fallback = null,
  onRefreshCredential,
  onSwitchAccount,
  onDisconnect,
  onConnect,
  onRetry,
  busyAction = null,
  failedAction = null,
}: StoreCredentialNoticeProps): React.ReactElement | null {
  const { t } = useI18n();
  // Disconnect drops this store's optional platform-account association, so it
  // always passes through an explicit confirmation before firing `onDisconnect`.
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = React.useState(false);
  const denial = classifyStoreCredentialDenial(error);
  if (!denial) return <>{fallback}</>;

  const handlers: Record<StoreCredentialDenialAction, (() => void) | undefined> = {
    refreshCredential: onRefreshCredential,
    switchAccount: onSwitchAccount,
    disconnect: onDisconnect,
    connect: onConnect,
    retry: onRetry,
  };
  // The first available action is primary (outline); the rest are ghosts.
  const available = denial.actions.filter(action => handlers[action]);
  const anyBusy = busyAction !== null;

  return (
    <div
      role="alert"
      data-testid="store-credential-notice"
      data-kind={denial.kind}
      className={cn(
        'rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-destructive">{t(denial.titleKey)}</p>
          <p className="text-sm text-muted-foreground">{t(denial.bodyKey)}</p>
        </div>
      </div>
      {available.length > 0 ? (
        <div className="flex flex-wrap gap-2 pl-8">
          {available.map((action, index) => {
            const copy = ACTION_COPY[action];
            const busy = busyAction === action;
            return (
              <Button
                key={action}
                type="button"
                size="sm"
                variant={index === 0 ? 'outline' : 'ghost'}
                className="min-h-11"
                disabled={anyBusy}
                onClick={
                  action === 'disconnect' ? () => setConfirmDisconnectOpen(true) : handlers[action]
                }
                data-testid={`store-credential-action-${action}`}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    {t(copy.busyKey)}
                  </>
                ) : (
                  t(copy.labelKey)
                )}
              </Button>
            );
          })}
        </div>
      ) : null}
      {failedAction ? (
        <p
          className="pl-8 text-sm font-medium text-destructive"
          data-testid="store-credential-action-error"
        >
          {t(ACTION_COPY[failedAction].failedKey)}
        </p>
      ) : null}
      {onDisconnect ? (
        <ConfirmDialog
          open={confirmDisconnectOpen}
          onOpenChange={setConfirmDisconnectOpen}
          title={t('storeCredential.accountStoreMismatchDisconnectConfirmTitle')}
          description={t('storeCredential.accountStoreMismatchDisconnectConfirmBody')}
          confirmLabel={t('storeCredential.accountStoreMismatchDisconnectConfirmCta')}
          cancelLabel={t('storeCredential.accountStoreMismatchDisconnectCancelCta')}
          onConfirm={onDisconnect}
          variant="destructive"
          isLoading={busyAction === 'disconnect'}
        />
      ) : null}
    </div>
  );
}
