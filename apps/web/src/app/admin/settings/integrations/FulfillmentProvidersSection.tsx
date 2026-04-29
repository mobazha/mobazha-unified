'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorAlert } from '@/components/ui/error-alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n, fulfillmentApi, FULFILLMENT_PROVIDERS } from '@mobazha/core';
import type { ProviderConnection, FulfillmentProviderID } from '@mobazha/core';
import { CatalogBrowserDialog } from './CatalogBrowserDialog';
import { SyncedProductsList } from './SyncedProductsList';

interface ProviderFormValues {
  apiKey: string;
}

export function FulfillmentProvidersSection() {
  const { t } = useI18n();

  const [connections, setConnections] = useState<Record<string, ProviderConnection>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, ProviderFormValues>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [catalogProvider, setCatalogProvider] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fulfillmentApi.getFulfillmentProviders();
      const map: Record<string, ProviderConnection> = {};
      for (const conn of list) {
        map[conn.providerId] = conn;
      }
      setConnections(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.fulfillment.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnect = useCallback(
    async (providerID: FulfillmentProviderID) => {
      const form = formValues[providerID];
      if (!form?.apiKey?.trim()) return;

      try {
        setSaving(providerID);
        setError(null);
        const conn = await fulfillmentApi.connectFulfillmentProvider(providerID, {
          credentials: { apiKey: form.apiKey.trim() },
        });
        setConnections(prev => ({ ...prev, [providerID]: conn }));
        setExpandedProvider(null);
        setFormValues(prev => ({ ...prev, [providerID]: { apiKey: '' } }));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('admin.fulfillment.saveFailed'));
      } finally {
        setSaving(null);
      }
    },
    [formValues, t]
  );

  const handleDisconnect = useCallback(async () => {
    if (!disconnectTarget) return;
    try {
      setDisconnecting(true);
      setError(null);
      await fulfillmentApi.disconnectFulfillmentProvider(disconnectTarget);
      setConnections(prev => {
        const next = { ...prev };
        delete next[disconnectTarget];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.fulfillment.deleteFailed'));
    } finally {
      setDisconnecting(false);
      setDisconnectTarget(null);
    }
  }, [disconnectTarget, t]);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t('admin.fulfillment.title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.fulfillment.subtitle')}</p>
      </div>

      {error && <ErrorAlert error={error} />}

      <div className="space-y-3">
        {FULFILLMENT_PROVIDERS.map(provider => {
          const conn = connections[provider.id];
          const isConnected = conn?.status === 'connected';
          const isExpanded = expandedProvider === provider.id;
          const isSaving = saving === provider.id;
          const form = formValues[provider.id] || { apiKey: '' };

          return (
            <div
              key={provider.id}
              className={cn(
                'rounded-lg border p-4 transition-colors',
                isConnected
                  ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
                  : 'border-border'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {t(provider.descKey as Parameters<typeof t>[0])}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        {t('admin.fulfillment.connected')}
                      </span>
                      <button
                        onClick={() => setDisconnectTarget(provider.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title={t('admin.fulfillment.disconnect')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : conn?.status === 'error' ? (
                    <span className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      {t('admin.fulfillment.error')}
                    </span>
                  ) : (
                    <button
                      onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {t('admin.fulfillment.connect')}
                    </button>
                  )}
                </div>
              </div>

              {/* Connected details */}
              {isConnected && conn && (
                <div className="mt-3 pt-3 border-t border-green-200/50 dark:border-green-800/50 space-y-2">
                  {conn.storeName && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {t('admin.fulfillment.storeName')}:
                      </span>
                      <span className="font-medium">{conn.storeName}</span>
                    </div>
                  )}
                  {conn.connectedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {t('admin.fulfillment.connectedAt')}:
                      </span>
                      <span>{new Date(conn.connectedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {conn.webhookUrl && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {t('admin.fulfillment.webhookUrl')}:
                      </span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded max-w-[300px] truncate">
                        {conn.webhookUrl}
                      </code>
                      <button
                        onClick={() => copyToClipboard(conn.webhookUrl!, `webhook-${provider.id}`)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title={t('admin.fulfillment.copy')}
                      >
                        {copiedField === `webhook-${provider.id}` ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => setCatalogProvider(provider.id)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1"
                    >
                      <Package className="w-3.5 h-3.5" />
                      {t('admin.fulfillment.browseCatalog')}
                    </button>
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {t('admin.fulfillment.viewDashboard')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="mt-3 pt-3 border-t border-green-200/50 dark:border-green-800/50">
                    <SyncedProductsList providerID={provider.id} providerName={provider.name} />
                  </div>
                </div>
              )}

              {/* Connect form */}
              {isExpanded && !isConnected && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('admin.fulfillment.apiKey')}
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey[provider.id] ? 'text' : 'password'}
                        value={form.apiKey}
                        onChange={e =>
                          setFormValues(prev => ({
                            ...prev,
                            [provider.id]: { apiKey: e.target.value },
                          }))
                        }
                        placeholder={t('admin.fulfillment.apiKeyPlaceholder')}
                        className="w-full px-3 py-2 pr-10 rounded-md border bg-background text-sm"
                      />
                      <button
                        onClick={() =>
                          setShowApiKey(prev => ({
                            ...prev,
                            [provider.id]: !prev[provider.id],
                          }))
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey[provider.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('admin.fulfillment.apiKeyHint', { provider: provider.name })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={isSaving || !form.apiKey.trim()}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSaving ? t('admin.fulfillment.saving') : t('admin.fulfillment.connect')}
                    </button>
                    <button
                      onClick={() => setExpandedProvider(null)}
                      className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
                    >
                      {t('admin.fulfillment.cancel')}
                    </button>
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {t('admin.fulfillment.learnMore')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Error state with reconnect */}
              {conn?.status === 'error' && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {conn.errorMessage && (
                    <p className="text-sm text-destructive">{conn.errorMessage}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedProvider(provider.id)}
                      className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
                    >
                      {t('admin.fulfillment.reconnect')}
                    </button>
                    <button
                      onClick={() => setDisconnectTarget(provider.id)}
                      className="px-3 py-1.5 text-sm rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      {t('admin.fulfillment.disconnect')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Catalog browser dialog */}
      {catalogProvider && (
        <CatalogBrowserDialog
          providerID={catalogProvider}
          providerName={
            FULFILLMENT_PROVIDERS.find(p => p.id === catalogProvider)?.name ?? catalogProvider
          }
          open={!!catalogProvider}
          onOpenChange={open => !open && setCatalogProvider(null)}
        />
      )}

      {/* Disconnect confirmation dialog */}
      <AlertDialog
        open={!!disconnectTarget}
        onOpenChange={open => !open && setDisconnectTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.fulfillment.disconnectConfirm', {
                provider: FULFILLMENT_PROVIDERS.find(p => p.id === disconnectTarget)?.name ?? '',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.fulfillment.disconnectConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>
              {t('admin.fulfillment.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('admin.fulfillment.disconnect')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
