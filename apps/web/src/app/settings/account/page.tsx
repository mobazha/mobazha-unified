'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  useToast,
  Skeleton,
} from '@/components/ui';
import {
  useI18n,
  isStandalone,
  getLinkedAccounts,
  unlinkAccount,
  startLinkAccount,
  hasLinkCallback,
  getLinkCallbackParams,
  getLinkCallbackStorefrontReturn,
  handleLinkCallback,
  clearLinkCallbackParams,
  SUPPORTED_PROVIDERS,
  standaloneStoresApi,
  hasSaaSToken,
  AccountLinkConflictError,
  getMergePreview,
  mergeAccount,
} from '@mobazha/core';
import { getSetupStatus } from '@mobazha/core/services/api/system';
import type {
  LinkedAccount,
  OAuthProvider,
  ProviderInfo,
  StandaloneStore,
  AccountLinkConflict,
  MergePreviewResponse,
} from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import {
  Link2,
  Unlink,
  AlertCircle,
  Check,
  Server,
  ExternalLink,
  Wifi,
  WifiOff,
  Loader2,
  GitMerge,
} from 'lucide-react';
import { ProviderIcon } from '@/components/ProviderIcon';
import { ConnectPlatformCard } from '@/components/ConnectPlatformCard';

export default function AccountSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const standaloneMode = useMemo(() => isStandalone(), []);

  // State — all hooks must be called unconditionally (React rules of hooks)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<OAuthProvider | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<OAuthProvider | null>(null);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [providerToUnlink, setProviderToUnlink] = useState<LinkedAccount | null>(null);

  // Standalone store state (V1: one store per user)
  const [standaloneStore, setStandaloneStore] = useState<StandaloneStore | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState(true);

  // When popup mode callback completes but window.close() is blocked by the browser,
  // show a "you can close this tab" hint instead of leaving the user stranded.
  const [showCloseTabHint, setShowCloseTabHint] = useState(false);

  // Account link conflict dialog state
  const [linkConflict, setLinkConflict] = useState<AccountLinkConflict | null>(null);

  // Account merge flow state (Phase 0.2)
  const [mergePreview, setMergePreview] = useState<MergePreviewResponse | null>(null);
  const [mergeConfirmInput, setMergeConfirmInput] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Standalone: null = loading, true = platform bound, false = not bound.
  // Based on persistent ownerUserId from the backend, not ephemeral JWT.
  const [platformBound, setPlatformBound] = useState<boolean | null>(() =>
    standaloneMode ? null : true
  );

  useEffect(() => {
    if (!standaloneMode) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await getSetupStatus();
        if (cancelled) return;
        setPlatformBound(!!status.ownerUserId?.trim());
      } catch {
        if (!cancelled) setPlatformBound(hasSaaSToken());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [standaloneMode]);

  // 加载已绑定账号
  const loadLinkedAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getLinkedAccounts();
      let accounts = response.accounts;
      // Standalone admin always has local password, so SaaS-side canUnlink
      // underestimates total login methods. Override to allow unbinding.
      if (standaloneMode) {
        accounts = accounts.map(a => ({ ...a, canUnlink: true }));
      }
      setLinkedAccounts(accounts);
    } catch (err) {
      console.error('Failed to load linked accounts:', err);
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsLoading(false);
    }
  }, [t, standaloneMode]);

  // Listen for messages from popup windows (conflict data, link success, etc.)
  useEffect(() => {
    const onMessage = (e: globalThis.MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'mbz-link-conflict' && e.data.conflict) {
        setLinkConflict(e.data.conflict as AccountLinkConflict);
      } else if (e.data?.type === 'mbz-link-success') {
        toast({
          title: t('common.success'),
          description: t('settings.accountBinding.linkSuccess'),
        });
        loadLinkedAccounts();
      } else if (e.data?.type === 'mbz-link-error' && e.data.message) {
        toast({
          title: t('common.error'),
          description: e.data.message,
          variant: 'destructive',
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [toast, t, loadLinkedAccounts]);

  // Casdoor link mode 绑定回调（Discord/Google/GitHub 等标准 OAuth provider）
  // Guard against effect re-runs. Without this, i18n hydration (which
  // changes `t` identity and therefore `loadLinkedAccounts` identity) causes
  // this effect to fire twice. The second run launches a second POST /link-callback
  // while the first one is already closing the popup via window.close(), so its
  // fetch aborts with `TypeError: Failed to fetch`. The catch branch then
  // postMessage'd that error back to the opener, producing a misleading
  // "Failed to fetch" toast after an actually-successful bind.
  const linkCallbackProcessedRef = useRef(false);
  useEffect(() => {
    if (linkCallbackProcessedRef.current) return;
    if (!hasLinkCallback()) return;

    const processLinkCallback = async () => {
      {
        const sfReturn = getLinkCallbackStorefrontReturn();
        const params = new URLSearchParams(window.location.search);
        const rawReturnTo = params.get('returnTo');
        const returnTo =
          rawReturnTo?.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : null;
        const { code, state, providerId } = getLinkCallbackParams();
        if (state && (code || providerId)) {
          // Mark as processed only once we have a real callback to handle.
          // Placed inside the guarded branch so unrelated mounts don't burn the
          // slot before the popup URL has been fully parsed.
          linkCallbackProcessedRef.current = true;

          const isPopup = params.get('popup') === '1';

          const notifyOpenerAndClose = (message: Record<string, unknown>) => {
            try {
              window.opener?.postMessage(message, window.location.origin);
            } catch {
              /* cross-origin or opener gone */
            }
            window.close();
            setTimeout(() => setShowCloseTabHint(true), 300);
          };

          try {
            const result = await handleLinkCallback(code, state, providerId);
            if (result.success) {
              if (isPopup) {
                notifyOpenerAndClose({ type: 'mbz-link-success' });
                return;
              }
              if (sfReturn) {
                window.location.href = `${sfReturn}${returnTo || '/settings/account'}`;
                return;
              }
              if (returnTo) {
                window.location.href = returnTo;
                return;
              }
              toast({
                title: t('common.success'),
                description: t('settings.accountBinding.linkSuccess'),
              });
              loadLinkedAccounts();
            } else {
              if (isPopup) {
                notifyOpenerAndClose({
                  type: 'mbz-link-error',
                  message: result.error || t('settings.accountBinding.linkFailed'),
                });
                return;
              }
              toast({
                title: t('common.error'),
                description: result.error || t('settings.accountBinding.linkFailed'),
                variant: 'destructive',
              });
            }
          } catch (err) {
            if (isPopup) {
              if (err instanceof AccountLinkConflictError) {
                notifyOpenerAndClose({ type: 'mbz-link-conflict', conflict: err.conflict });
              } else {
                notifyOpenerAndClose({
                  type: 'mbz-link-error',
                  message:
                    err instanceof Error ? err.message : t('settings.accountBinding.linkFailed'),
                });
              }
              return;
            }
            if (err instanceof AccountLinkConflictError) {
              setLinkConflict(err.conflict);
            } else {
              toast({
                title: t('common.error'),
                description:
                  err instanceof Error ? err.message : t('settings.accountBinding.linkFailed'),
                variant: 'destructive',
              });
            }
          } finally {
            clearLinkCallbackParams();
          }
        }
      }
    };

    processLinkCallback();
  }, [toast, loadLinkedAccounts, t]);

  // 初始加载 — skip when standalone admin hasn't connected to platform
  useEffect(() => {
    if (standaloneMode && !platformBound) return;
    loadLinkedAccounts();
  }, [loadLinkedAccounts, standaloneMode, platformBound]);

  // Load standalone store — skip when standalone admin hasn't connected to platform
  useEffect(() => {
    if (standaloneMode && !platformBound) {
      setIsLoadingStores(false);
      return;
    }
    async function loadStore() {
      try {
        const store = await standaloneStoresApi.getMyStandaloneStore();
        setStandaloneStore(store);
      } catch {
        // Not critical — user may not have any standalone store
      } finally {
        setIsLoadingStores(false);
      }
    }
    loadStore();
  }, [standaloneMode, platformBound]);

  // 获取未绑定的 Provider
  const getAvailableProviders = () => {
    const linkedProviderIds = linkedAccounts.map(a => a.provider);
    return SUPPORTED_PROVIDERS.filter(p => !linkedProviderIds.includes(p.id));
  };

  // 获取 Provider 信息
  const getProviderInfo = (providerId: OAuthProvider): ProviderInfo | undefined => {
    return SUPPORTED_PROVIDERS.find(p => p.id === providerId);
  };

  // 绑定账号 — Telegram 由 widget 处理, 其他 provider 走 Casdoor link mode
  const handleLink = async (provider: OAuthProvider) => {
    try {
      setLinkingProvider(provider);
      await startLinkAccount(provider);
      // Popup closed (standalone) — refresh accounts to pick up new binding
      loadLinkedAccounts();
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('settings.accountBinding.linkFailed'),
        variant: 'destructive',
      });
    } finally {
      setLinkingProvider(null);
    }
  };

  // 确认解绑
  const confirmUnlink = (account: LinkedAccount) => {
    setProviderToUnlink(account);
    setShowUnlinkDialog(true);
  };

  // 解绑账号
  const handleUnlink = async () => {
    if (!providerToUnlink) return;

    try {
      setUnlinkingProvider(providerToUnlink.provider);
      setShowUnlinkDialog(false);
      await unlinkAccount(providerToUnlink.provider);
      toast({
        title: t('common.success'),
        description: t('settings.accountBinding.unlinkSuccess'),
      });
      loadLinkedAccounts();
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('settings.accountBinding.unlinkFailed'),
        variant: 'destructive',
      });
    } finally {
      setUnlinkingProvider(null);
      setProviderToUnlink(null);
    }
  };

  const availableProviders = getAvailableProviders();

  // 已绑定账号卡片
  const renderLinkedAccountCard = (account: LinkedAccount) => {
    const providerInfo = getProviderInfo(account.provider);
    return (
      <div
        key={`${account.provider}-${account.providerId}`}
        className="flex items-center justify-between p-3 border-b border-border last:border-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ProviderIcon provider={account.provider} />
          </div>
          <div>
            <p className="font-medium text-sm">{providerInfo?.name || account.provider}</p>
            <p className="text-xs text-muted-foreground">
              ID:{' '}
              {account.providerId.length > 20
                ? `${account.providerId.slice(0, 10)}...${account.providerId.slice(-6)}`
                : account.providerId}
            </p>
          </div>
        </div>
        {account.canUnlink && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => confirmUnlink(account)}
            disabled={unlinkingProvider === account.provider}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Unlink className="w-4 h-4 mr-1" />
            {unlinkingProvider === account.provider ? '...' : t('settings.accountBinding.unlink')}
          </Button>
        )}
      </div>
    );
  };

  // 可绑定账号卡片 — all providers use Casdoor OAuth redirect uniformly
  const renderAvailableProviderCard = (provider: ProviderInfo) => {
    return (
      <div
        key={provider.id}
        className="flex items-center justify-between p-3 border-b border-border last:border-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ProviderIcon provider={provider.id} />
          </div>
          <div>
            <p className="font-medium text-sm">{provider.name}</p>
            <p className="text-xs text-muted-foreground">
              {t('settings.accountBinding.notLinked')}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleLink(provider.id)}
          disabled={linkingProvider === provider.id}
        >
          <Link2 className="w-4 h-4 mr-1" />
          {linkingProvider === provider.id ? '...' : t('settings.accountBinding.link')}
        </Button>
      </div>
    );
  };

  // Popup callback completed but window.close() was blocked by the browser.
  // Show a simple hint so the user knows to close the tab manually.
  if (showCloseTabHint) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
        <Check className="w-12 h-12 text-green-500" />
        <h2 className="text-lg font-semibold">{t('settings.accountBinding.linkSuccess')}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t('settings.accountBinding.closeTabHint', {
            defaultValue:
              'Account linked successfully. You can close this tab and return to your store.',
          })}
        </p>
      </div>
    );
  }

  if (standaloneMode && platformBound !== true) {
    return (
      <div>
        <SettingsPageHeader
          title={t('settings.sidebar.account')}
          description={t('settings.accountBinding.description')}
        />
        {platformBound === null ? (
          <Card className="p-8 flex items-center justify-center">
            <Skeleton className="h-6 w-48" />
          </Card>
        ) : (
          <ConnectPlatformCard
            title={t('settings.accountBinding.standaloneSocialTitle', {
              defaultValue: 'Social Account Binding',
            })}
            description={t('settings.accountBinding.standaloneConnectDesc', {
              defaultValue:
                'Connect your Telegram, Discord, or Google account to enable quick social login. Sign in to Mobazha Platform first to manage your linked accounts.',
            })}
            onConnected={() => {
              setPlatformBound(true);
              loadLinkedAccounts();
            }}
          >
            <div className="flex items-center justify-center gap-4 mt-6 text-muted-foreground/50">
              {SUPPORTED_PROVIDERS.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <ProviderIcon provider={p.id} />
                  </div>
                  <span className="text-xs">{p.name}</span>
                </div>
              ))}
            </div>
          </ConnectPlatformCard>
        )}
      </div>
    );
  }

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.account')}
        description={t('settings.accountBinding.description')}
      />

      <Card className="p-4 md:p-6">
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive bg-destructive/10">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={loadLinkedAccounts}>
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t('settings.accountBinding.linked')}
            </h4>
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ) : linkedAccounts.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                <p className="text-sm">{t('settings.accountBinding.noLinked')}</p>
                <p className="text-xs mt-1">{t('settings.accountBinding.description')}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                {linkedAccounts.map(renderLinkedAccountCard)}
              </div>
            )}
          </div>

          {availableProviders.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t('settings.accountBinding.available')}
              </h4>
              <div className="rounded-lg border border-border overflow-hidden">
                {availableProviders.map(renderAvailableProviderCard)}
              </div>
            </div>
          )}

          {/* Standalone Store Section (V1: single store per user) */}
          {!isLoadingStores && standaloneStore && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t('settings.accountBinding.standaloneStore')}
              </h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Server className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {standaloneStore.domain ||
                            `${standaloneStore.peer_id.slice(0, 8)}...${standaloneStore.peer_id.slice(-6)}`}
                        </p>
                        {standaloneStore.last_heartbeat &&
                        Date.now() - new Date(standaloneStore.last_heartbeat).getTime() <
                          5 * 60 * 1000 ? (
                          <Wifi className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {standaloneStore.connectivity === 'public'
                          ? 'Public'
                          : standaloneStore.connectivity === 'tunnel'
                            ? 'Tunnel'
                            : 'NAT'}
                        {standaloneStore.endpoint_url &&
                          (() => {
                            try {
                              const hostname = new URL(standaloneStore.endpoint_url).hostname;
                              return (
                                <>
                                  {' · '}
                                  <a
                                    href={standaloneStore.endpoint_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                                  >
                                    {hostname}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </>
                              );
                            } catch {
                              return null;
                            }
                          })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">{t('settings.accountBinding.keepOne')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.accountBinding.keepOneDesc')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 解绑确认对话框 */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.accountBinding.unlinkConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.accountBinding.unlinkConfirmDesc', {
                provider: providerToUnlink
                  ? (getProviderInfo(providerToUnlink.provider)?.name ?? '')
                  : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('settings.accountBinding.unlink')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 绑定冲突对话框 */}
      <AlertDialog
        open={!!linkConflict && !mergePreview}
        onOpenChange={open => !open && setLinkConflict(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              {t('settings.accountBinding.conflictTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  {t('settings.accountBinding.conflictDesc', {
                    provider:
                      SUPPORTED_PROVIDERS.find(p => p.id === linkConflict?.provider)?.name ??
                      linkConflict?.provider ??
                      '',
                  })}
                </p>
                <div className="rounded-lg border border-border p-3 bg-muted/50 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('settings.accountBinding.conflictOtherAccount')}
                    </span>
                    <span className="font-mono">
                      {linkConflict?.otherAccountName
                        ? `${linkConflict.otherAccountName.slice(0, 4)}****${linkConflict.otherAccountName.slice(-4)}`
                        : ''}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('settings.accountBinding.conflictProviderCount', {
                        count: linkConflict?.otherAccountProviderCount ?? 0,
                      })}
                    </span>
                  </div>
                </div>
                {linkConflict?.otherAccountProviderCount === 1 ? (
                  <p className="text-muted-foreground">
                    {t('settings.accountBinding.conflictMergeHint')}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    {t('settings.accountBinding.conflictGuidance', {
                      provider:
                        SUPPORTED_PROVIDERS.find(p => p.id === linkConflict?.provider)?.name ??
                        linkConflict?.provider ??
                        '',
                    })}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLinkConflict(null)}>
              {t('settings.accountBinding.conflictClose')}
            </AlertDialogCancel>
            {linkConflict?.otherAccountProviderCount === 1 && (
              <AlertDialogAction
                disabled={isLoadingPreview}
                onClick={async () => {
                  if (!linkConflict) return;
                  setIsLoadingPreview(true);
                  try {
                    const preview = await getMergePreview(linkConflict.otherAccountName);
                    setMergePreview(preview);
                  } catch (err) {
                    toast({
                      title: t('common.error'),
                      description:
                        err instanceof Error
                          ? err.message
                          : t('settings.accountBinding.mergeFailed'),
                      variant: 'destructive',
                    });
                  } finally {
                    setIsLoadingPreview(false);
                  }
                }}
              >
                {isLoadingPreview ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <GitMerge className="w-4 h-4 mr-1" />
                )}
                {t('settings.accountBinding.mergeButton')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 合并预览对话框 */}
      <AlertDialog
        open={!!mergePreview}
        onOpenChange={open => {
          if (!open) {
            setMergePreview(null);
            setMergeConfirmInput('');
            setLinkConflict(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-primary" />
              {t('settings.accountBinding.mergePreviewTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>{t('settings.accountBinding.mergePreviewDesc')}</p>

                <div className="rounded-lg border border-border p-3 bg-muted/50 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('settings.accountBinding.mergePreviewStores')}
                  </p>
                  {mergePreview && mergePreview.peerIds.length > 0 ? (
                    mergePreview.peerIds.map(s => (
                      <div key={s.peerId} className="flex items-center gap-2 text-xs">
                        <Server className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>
                          {s.domain ||
                            s.storeName ||
                            `${s.peerId.slice(0, 8)}...${s.peerId.slice(-6)}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {t('settings.accountBinding.mergeNoStores')}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border p-3 bg-muted/50 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('settings.accountBinding.mergePreviewProvider')}
                  </p>
                  {mergePreview?.providers.map(p => (
                    <div key={p} className="flex items-center gap-2 text-xs">
                      <ProviderIcon provider={p as OAuthProvider} />
                      <span>{SUPPORTED_PROVIDERS.find(sp => sp.id === p)?.name ?? p}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('settings.accountBinding.mergeConfirmLabel')}
                  </label>
                  <Input
                    value={mergeConfirmInput}
                    onChange={e => setMergeConfirmInput(e.target.value)}
                    placeholder={t('settings.accountBinding.mergeConfirmPlaceholder')}
                    className="text-sm"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setMergePreview(null);
                setMergeConfirmInput('');
                setLinkConflict(null);
              }}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isMerging || !mergePreview || mergeConfirmInput !== mergePreview.oldAccountName
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!mergePreview) return;
                setIsMerging(true);
                try {
                  await mergeAccount(mergePreview.oldAccountName);
                  toast({
                    title: t('common.success'),
                    description: t('settings.accountBinding.mergeSuccess'),
                  });
                  setMergePreview(null);
                  setMergeConfirmInput('');
                  setLinkConflict(null);
                  loadLinkedAccounts();
                } catch (err) {
                  toast({
                    title: t('common.error'),
                    description:
                      err instanceof Error ? err.message : t('settings.accountBinding.mergeFailed'),
                    variant: 'destructive',
                  });
                } finally {
                  setIsMerging(false);
                }
              }}
            >
              {isMerging && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {t('settings.accountBinding.mergeExecute')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
