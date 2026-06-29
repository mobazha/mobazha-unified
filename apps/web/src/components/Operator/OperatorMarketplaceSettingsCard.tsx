'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  MARKETPLACE_CATALOG_MODE_KEYS,
  MARKETPLACE_DISCOVERABILITY_KEYS,
  MARKETPLACE_SELLER_ENTRY_MODE_KEYS,
  useI18n,
} from '@mobazha/core';
import type {
  MarketplaceCatalogMode,
  MarketplaceDiscoverability,
  MarketplaceSellerEntryMode,
  NativeMarketplace,
  UpdateNativeMarketplaceRequest,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface MarketplaceSettingsFormState {
  name: string;
  description: string;
  vertical: string;
  discoverability: MarketplaceDiscoverability;
  catalogMode: MarketplaceCatalogMode;
  sellerEntryMode: MarketplaceSellerEntryMode;
  subdomain: string;
  customDomain: string;
}

function domainHost(marketplace: NativeMarketplace, kind: 'subdomain' | 'custom'): string {
  return marketplace.domains.find(domain => domain.kind === kind)?.host ?? '';
}

function subdomainTokenFromHost(host: string): string {
  const trimmed = host.trim();
  if (!trimmed) return '';
  const dotIndex = trimmed.indexOf('.');
  return dotIndex === -1 ? trimmed : trimmed.slice(0, dotIndex);
}

function subdomainToken(marketplace: NativeMarketplace): string {
  const host = domainHost(marketplace, 'subdomain');
  return host ? subdomainTokenFromHost(host) : '';
}

function buildFormState(marketplace: NativeMarketplace): MarketplaceSettingsFormState {
  return {
    name: marketplace.name,
    description: marketplace.description ?? '',
    vertical: marketplace.vertical,
    discoverability: marketplace.discoverability,
    catalogMode: marketplace.catalogMode,
    sellerEntryMode: marketplace.sellerEntryMode,
    subdomain: subdomainToken(marketplace),
    customDomain: domainHost(marketplace, 'custom'),
  };
}

function buildPartialUpdate(
  form: MarketplaceSettingsFormState,
  marketplace: NativeMarketplace
): UpdateNativeMarketplaceRequest {
  const payload: UpdateNativeMarketplaceRequest = {};
  const trimmedName = form.name.trim();
  const trimmedDescription = form.description.trim();
  const trimmedVertical = form.vertical.trim();
  const trimmedSubdomain = form.subdomain.trim();
  const trimmedCustomDomain = form.customDomain.trim();
  const serverSubdomainToken = subdomainToken(marketplace);
  const serverCustomDomain = domainHost(marketplace, 'custom');

  if (trimmedName && trimmedName !== marketplace.name) {
    payload.name = trimmedName;
  }
  if (trimmedDescription !== (marketplace.description ?? '')) {
    payload.description = trimmedDescription;
  }
  if (trimmedVertical && trimmedVertical !== marketplace.vertical) {
    payload.vertical = trimmedVertical;
  }
  if (form.discoverability !== marketplace.discoverability) {
    payload.discoverability = form.discoverability;
  }
  if (form.catalogMode !== marketplace.catalogMode) {
    payload.catalogMode = form.catalogMode;
  }
  if (form.sellerEntryMode !== marketplace.sellerEntryMode) {
    payload.sellerEntryMode = form.sellerEntryMode;
  }
  if (trimmedSubdomain && trimmedSubdomain !== serverSubdomainToken) {
    payload.subdomain = trimmedSubdomain;
  }
  if (trimmedCustomDomain && trimmedCustomDomain !== serverCustomDomain) {
    payload.domain = trimmedCustomDomain;
  }

  return payload;
}

function domainClearBlocked(
  form: MarketplaceSettingsFormState,
  marketplace: NativeMarketplace
): { subdomain: boolean; customDomain: boolean } {
  const serverSubdomainToken = subdomainToken(marketplace);
  const serverCustomDomain = domainHost(marketplace, 'custom');
  const trimmedSubdomain = form.subdomain.trim();
  const trimmedCustomDomain = form.customDomain.trim();

  return {
    subdomain: Boolean(serverSubdomainToken) && !trimmedSubdomain,
    customDomain: Boolean(serverCustomDomain) && !trimmedCustomDomain,
  };
}

interface OperatorMarketplaceSettingsCardProps {
  marketplace: NativeMarketplace;
  working: string | null;
  onSave: (data: UpdateNativeMarketplaceRequest) => Promise<NativeMarketplace | null>;
  onArchive: () => Promise<unknown>;
}

export function OperatorMarketplaceSettingsCard({
  marketplace,
  working,
  onSave,
  onArchive,
}: OperatorMarketplaceSettingsCardProps) {
  const { t } = useI18n();
  const isArchived = marketplace.status === 'archived';
  const isBusy = Boolean(working);
  const [form, setForm] = useState<MarketplaceSettingsFormState>(() => buildFormState(marketplace));

  const setField = useCallback(
    <K extends keyof MarketplaceSettingsFormState>(
      key: K,
      value: MarketplaceSettingsFormState[K]
    ) => {
      setForm(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const blockedDomainClear = useMemo(
    () => domainClearBlocked(form, marketplace),
    [form, marketplace]
  );

  const canSave = useMemo(() => {
    if (isArchived || !form.name.trim()) return false;
    if (blockedDomainClear.subdomain || blockedDomainClear.customDomain) return false;
    return Object.keys(buildPartialUpdate(form, marketplace)).length > 0;
  }, [blockedDomainClear, form, isArchived, marketplace]);

  async function handleSave() {
    const payload = buildPartialUpdate(form, marketplace);
    if (Object.keys(payload).length === 0) return;
    const updated = await onSave(payload);
    if (updated) {
      setForm(buildFormState(updated));
    }
  }

  return (
    <Card data-testid="operator-marketplace-settings-card">
      <CardHeader>
        <CardTitle>{t('marketplace.operator.settingsTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('marketplace.operator.settingsDesc')}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isArchived ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {t('marketplace.operator.readOnlyArchived')}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="operator-marketplace-name">
              {t('marketplace.operator.namePlaceholder')}
            </Label>
            <Input
              id="operator-marketplace-name"
              data-testid="operator-marketplace-name"
              value={form.name}
              disabled={isArchived || isBusy}
              onChange={event => setField('name', event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="operator-marketplace-description">
              {t('marketplace.operator.descriptionLabel')}
            </Label>
            <Textarea
              id="operator-marketplace-description"
              data-testid="operator-marketplace-description"
              value={form.description}
              disabled={isArchived || isBusy}
              placeholder={t('marketplace.operator.descriptionPlaceholder')}
              onChange={event => setField('description', event.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operator-marketplace-vertical">
              {t('marketplace.operator.verticalLabel')}
            </Label>
            <Input
              id="operator-marketplace-vertical"
              data-testid="operator-marketplace-vertical"
              value={form.vertical}
              disabled={isArchived || isBusy}
              placeholder={t('marketplace.operator.verticalPlaceholder')}
              onChange={event => setField('vertical', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('marketplace.operator.discoverability')}</Label>
            <Select
              value={form.discoverability}
              disabled={isArchived || isBusy}
              onValueChange={value =>
                setField('discoverability', value as MarketplaceDiscoverability)
              }
            >
              <SelectTrigger data-testid="operator-marketplace-discoverability">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(MARKETPLACE_DISCOVERABILITY_KEYS) as MarketplaceDiscoverability[]
                ).map(option => (
                  <SelectItem key={option} value={option}>
                    {t(MARKETPLACE_DISCOVERABILITY_KEYS[option])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('marketplace.operator.catalogMode')}</Label>
            <Select
              value={form.catalogMode}
              disabled={isArchived || isBusy}
              onValueChange={value => setField('catalogMode', value as MarketplaceCatalogMode)}
            >
              <SelectTrigger data-testid="operator-marketplace-catalog-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MARKETPLACE_CATALOG_MODE_KEYS) as MarketplaceCatalogMode[]).map(
                  option => (
                    <SelectItem key={option} value={option}>
                      {t(MARKETPLACE_CATALOG_MODE_KEYS[option])}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('marketplace.operator.sellerEntryMode')}</Label>
            <Select
              value={form.sellerEntryMode}
              disabled={isArchived || isBusy}
              onValueChange={value =>
                setField('sellerEntryMode', value as MarketplaceSellerEntryMode)
              }
            >
              <SelectTrigger data-testid="operator-marketplace-seller-entry-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(MARKETPLACE_SELLER_ENTRY_MODE_KEYS) as MarketplaceSellerEntryMode[]
                ).map(option => (
                  <SelectItem key={option} value={option}>
                    {t(MARKETPLACE_SELLER_ENTRY_MODE_KEYS[option])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operator-marketplace-subdomain">
              {t('marketplace.operator.subdomainLabel')}
            </Label>
            <Input
              id="operator-marketplace-subdomain"
              data-testid="operator-marketplace-subdomain"
              value={form.subdomain}
              disabled={isArchived || isBusy}
              placeholder={t('marketplace.operator.subdomainPlaceholder')}
              onChange={event => setField('subdomain', event.target.value)}
            />
            {blockedDomainClear.subdomain ? (
              <p
                className="text-sm text-destructive"
                data-testid="operator-marketplace-subdomain-clear-blocked"
              >
                {t('marketplace.operator.domainRemovalUnavailable')}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="operator-marketplace-custom-domain">
              {t('marketplace.operator.customDomainLabel')}
            </Label>
            <Input
              id="operator-marketplace-custom-domain"
              data-testid="operator-marketplace-custom-domain"
              value={form.customDomain}
              disabled={isArchived || isBusy}
              placeholder={t('marketplace.operator.customDomainPlaceholder')}
              onChange={event => setField('customDomain', event.target.value)}
            />
            {blockedDomainClear.customDomain ? (
              <p
                className="text-sm text-destructive"
                data-testid="operator-marketplace-custom-domain-clear-blocked"
              >
                {t('marketplace.operator.domainRemovalUnavailable')}
              </p>
            ) : null}
          </div>
        </div>

        {!isArchived ? (
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              data-testid="operator-marketplace-save"
              disabled={!canSave || isBusy}
              onClick={() => void handleSave()}
            >
              {working === 'update' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('marketplace.operator.saveSettings')}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  data-testid="operator-marketplace-archive-trigger"
                  disabled={isBusy}
                >
                  {t('marketplace.operator.archiveAction')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('marketplace.operator.archiveTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('marketplace.operator.archiveDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    data-testid="operator-marketplace-archive-confirm"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isBusy}
                    onClick={event => {
                      event.preventDefault();
                      void onArchive();
                    }}
                  >
                    {working === 'archive' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {t('marketplace.operator.archiveConfirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
