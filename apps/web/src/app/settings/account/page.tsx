'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  getLinkedAccounts,
  unlinkAccount,
  startLinkAccount,
  hasLinkCallback,
  getLinkCallbackParams,
  handleLinkCallback,
  clearLinkCallbackParams,
  SUPPORTED_PROVIDERS,
} from '@mobazha/core';
import type { LinkedAccount, OAuthProvider, ProviderInfo } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Link2, Unlink, AlertCircle, Check } from 'lucide-react';
import { ProviderIcon } from '@/components/ProviderIcon';

export default function AccountSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  // State
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<OAuthProvider | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<OAuthProvider | null>(null);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [providerToUnlink, setProviderToUnlink] = useState<LinkedAccount | null>(null);

  // 加载已绑定账号
  const loadLinkedAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getLinkedAccounts();
      setLinkedAccounts(response.accounts);
    } catch (err) {
      console.error('Failed to load linked accounts:', err);
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // 处理绑定回调
  useEffect(() => {
    const processLinkCallback = async () => {
      if (hasLinkCallback()) {
        const { code, state } = getLinkCallbackParams();
        if (code && state) {
          try {
            const result = await handleLinkCallback(code, state);
            if (result.success) {
              toast({
                title: t('common.success'),
                description: t('settings.accountBinding.linkSuccess'),
              });
              loadLinkedAccounts();
            } else {
              toast({
                title: t('common.error'),
                description: result.error || t('settings.accountBinding.linkFailed'),
                variant: 'destructive',
              });
            }
          } catch (err) {
            toast({
              title: t('common.error'),
              description:
                err instanceof Error ? err.message : t('settings.accountBinding.linkFailed'),
              variant: 'destructive',
            });
          } finally {
            clearLinkCallbackParams();
          }
        }
      }
    };

    processLinkCallback();
  }, [toast, loadLinkedAccounts, t]);

  // 初始加载
  useEffect(() => {
    loadLinkedAccounts();
  }, [loadLinkedAccounts]);

  // 获取未绑定的 Provider
  const getAvailableProviders = () => {
    const linkedProviderIds = linkedAccounts.map(a => a.provider);
    return SUPPORTED_PROVIDERS.filter(p => !linkedProviderIds.includes(p.id));
  };

  // 获取 Provider 信息
  const getProviderInfo = (providerId: OAuthProvider): ProviderInfo | undefined => {
    return SUPPORTED_PROVIDERS.find(p => p.id === providerId);
  };

  // 绑定账号
  const handleLink = async (provider: OAuthProvider) => {
    try {
      setLinkingProvider(provider);
      await startLinkAccount(provider);
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('settings.accountBinding.linkFailed'),
        variant: 'destructive',
      });
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

  // 可绑定账号卡片
  const renderAvailableProviderCard = (provider: ProviderInfo) => (
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
          <p className="text-xs text-muted-foreground">{t('settings.accountBinding.notLinked')}</p>
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
    </div>
  );
}
