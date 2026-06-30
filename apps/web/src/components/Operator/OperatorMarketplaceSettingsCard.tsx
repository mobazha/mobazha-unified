'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  MARKETPLACE_CATALOG_MODE_KEYS,
  MARKETPLACE_DISCOVERABILITY_KEYS,
  MARKETPLACE_JOIN_MODE_KEYS,
  MARKETPLACE_SELLER_ENTRY_MODE_KEYS,
  useI18n,
} from '@mobazha/core';
import type {
  MarketplaceCatalogMode,
  MarketplaceDiscoverability,
  MarketplaceJoinMode,
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
  logoURL: string;
  bannerURL: string;
  vertical: string;
  joinMode: MarketplaceJoinMode;
  discoverability: MarketplaceDiscoverability;
  catalogMode: MarketplaceCatalogMode;
  sellerEntryMode: MarketplaceSellerEntryMode;
  customDomain: string;
  catalogQuery: string;
}

function domainHost(marketplace: NativeMarketplace, kind: 'subdomain' | 'custom'): string {
  return marketplace.domains.find(domain => domain.kind === kind)?.host ?? '';
}

function normalizeOptionalString(value: string): string {
  return value.trim();
}

function isValidHostname(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > 253) return false;
  if (trimmed.includes('://') || trimmed.includes('/')) return false;

  const labels = trimmed.split('.');
  if (labels.length < 2) return false;
  return labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

function isValidMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface MarketplaceSettingsValidation {
  name: boolean;
  vertical: boolean;
  customDomain: boolean;
  logoURL: boolean;
  bannerURL: boolean;
}

function validateForm(form: MarketplaceSettingsFormState): MarketplaceSettingsValidation {
  return {
    name: form.name.trim().length > 0,
    vertical: form.vertical.trim().length > 0,
    customDomain: !form.customDomain.trim() || isValidHostname(form.customDomain),
    logoURL: isValidMediaUrl(form.logoURL),
    bannerURL: isValidMediaUrl(form.bannerURL),
  };
}

function buildFormState(marketplace: NativeMarketplace): MarketplaceSettingsFormState {
  return {
    name: marketplace.name,
    description: marketplace.description ?? '',
    logoURL: marketplace.logoURL ?? '',
    bannerURL: marketplace.bannerURL ?? '',
    vertical: marketplace.vertical,
    joinMode: marketplace.joinMode,
    discoverability: marketplace.discoverability,
    catalogMode: marketplace.catalogMode,
    sellerEntryMode: marketplace.sellerEntryMode,
    customDomain: domainHost(marketplace, 'custom'),
    catalogQuery: marketplace.catalogQuery ?? '',
  };
}

function buildPartialUpdate(
  form: MarketplaceSettingsFormState,
  marketplace: NativeMarketplace
): UpdateNativeMarketplaceRequest {
  const payload: UpdateNativeMarketplaceRequest = {};
  const normalizedName = form.name.trim();
  const normalizedDescription = normalizeOptionalString(form.description);
  const normalizedLogoURL = normalizeOptionalString(form.logoURL);
  const normalizedBannerURL = normalizeOptionalString(form.bannerURL);
  const normalizedCustomDomain = normalizeOptionalString(form.customDomain);
  const normalizedCatalogQuery = normalizeOptionalString(form.catalogQuery);
  const normalizedVertical = form.vertical.trim();
  const normalizedServerDescription = marketplace.description ?? '';
  const normalizedServerLogoURL = marketplace.logoURL ?? '';
  const normalizedServerBannerURL = marketplace.bannerURL ?? '';
  const serverCustomDomain = domainHost(marketplace, 'custom');
  const serverCatalogQuery = marketplace.catalogQuery ?? '';

  if (normalizedName !== marketplace.name) {
    payload.name = normalizedName;
  }
  if (normalizedDescription !== normalizedServerDescription) {
    payload.description = normalizedDescription;
  }
  if (normalizedLogoURL !== normalizedServerLogoURL) {
    payload.logoURL = normalizedLogoURL;
  }
  if (normalizedBannerURL !== normalizedServerBannerURL) {
    payload.bannerURL = normalizedBannerURL;
  }
  if (form.joinMode !== marketplace.joinMode) {
    payload.joinMode = form.joinMode;
  }
  if (normalizedVertical !== marketplace.vertical) {
    payload.vertical = normalizedVertical;
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
  if (normalizedCatalogQuery !== serverCatalogQuery) {
    payload.catalogQuery = normalizedCatalogQuery;
  }
  if (normalizedCustomDomain !== serverCustomDomain) {
    // Hosting semantics: empty string removes custom domain.
    payload.domain = normalizedCustomDomain;
  }

  return payload;
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
  const platformSubdomain = domainHost(marketplace, 'subdomain');
  const customDomainRecord = marketplace.domains.find(domain => domain.kind === 'custom');
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

  const validation = useMemo(() => validateForm(form), [form]);
  const isDirty = useMemo(
    () => Object.keys(buildPartialUpdate(form, marketplace)).length > 0,
    [form, marketplace]
  );

  const canSave = useMemo(() => {
    if (isArchived) return false;
    if (
      !validation.name ||
      !validation.vertical ||
      !validation.customDomain ||
      !validation.logoURL ||
      !validation.bannerURL
    ) {
      return false;
    }
    return isDirty;
  }, [isArchived, isDirty, validation]);

  async function handleSave() {
    const payload = buildPartialUpdate(form, marketplace);
    if (Object.keys(payload).length === 0) return;
    const updated = await onSave(payload);
    if (updated) {
      setForm(buildFormState(updated));
    }
  }

  function handleDiscardChanges() {
    setForm(buildFormState(marketplace));
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
            <h3 className="text-sm font-semibold text-foreground">
              {t('marketplace.operator.brandSectionTitle')}
            </h3>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="operator-marketplace-name">{t('marketplace.operator.nameLabel')}</Label>
            <Input
              id="operator-marketplace-name"
              data-testid="operator-marketplace-name"
              value={form.name}
              disabled={isArchived || isBusy}
              onChange={event => setField('name', event.target.value)}
            />
            {!validation.name ? (
              <p className="text-sm text-destructive" data-testid="operator-marketplace-name-error">
                {t('marketplace.operator.validationNameRequired')}
              </p>
            ) : null}
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
            <Label htmlFor="operator-marketplace-logo">{t('marketplace.operator.logoLabel')}</Label>
            <Input
              id="operator-marketplace-logo"
              data-testid="operator-marketplace-logo-url"
              value={form.logoURL}
              disabled={isArchived || isBusy}
              placeholder={t('marketplace.operator.logoPlaceholder')}
              onChange={event => setField('logoURL', event.target.value)}
            />
            {!validation.logoURL ? (
              <p
                className="text-sm text-destructive"
                data-testid="operator-marketplace-logo-url-error"
              >
                {t('marketplace.operator.validationInvalidMediaUrl')}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="operator-marketplace-banner">
              {t('marketplace.operator.bannerLabel')}
            </Label>
            <Input
              id="operator-marketplace-banner"
              data-testid="operator-marketplace-banner-url"
              value={form.bannerURL}
              disabled={isArchived || isBusy}
              placeholder={t('marketplace.operator.bannerPlaceholder')}
              onChange={event => setField('bannerURL', event.target.value)}
            />
            {!validation.bannerURL ? (
              <p
                className="text-sm text-destructive"
                data-testid="operator-marketplace-banner-url-error"
              >
                {t('marketplace.operator.validationInvalidMediaUrl')}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('marketplace.operator.accessSectionTitle')}
            </h3>
          </div>

          <div className="space-y-2">
            <Label>{t('marketplace.operator.joinMode')}</Label>
            <Select
              value={form.joinMode}
              disabled={isArchived || isBusy}
              onValueChange={value => setField('joinMode', value as MarketplaceJoinMode)}
            >
              <SelectTrigger data-testid="operator-marketplace-join-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MARKETPLACE_JOIN_MODE_KEYS) as MarketplaceJoinMode[]).map(option => (
                  <SelectItem key={option} value={option}>
                    {t(MARKETPLACE_JOIN_MODE_KEYS[option])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="operator-marketplace-catalog-query">
              {t('marketplace.operator.catalogQueryLabel')}
            </Label>
            <Input
              id="operator-marketplace-catalog-query"
              data-testid="operator-marketplace-catalog-query"
              value={form.catalogQuery}
              disabled={isArchived || isBusy}
              placeholder={t('marketplace.operator.catalogQueryPlaceholder')}
              onChange={event => setField('catalogQuery', event.target.value)}
            />
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
          <div className="space-y-2 md:col-span-2">
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
            {!validation.vertical ? (
              <p
                className="text-sm text-destructive"
                data-testid="operator-marketplace-vertical-error"
              >
                {t('marketplace.operator.validationVerticalRequired')}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('marketplace.operator.domainsSectionTitle')}
            </h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operator-marketplace-subdomain">
              {t('marketplace.operator.platformSubdomainLabel')}
            </Label>
            <Input
              id="operator-marketplace-subdomain"
              data-testid="operator-marketplace-platform-subdomain"
              value={platformSubdomain}
              disabled
              placeholder={t('marketplace.operator.subdomainPlaceholder')}
            />
            <p className="text-sm text-muted-foreground">
              {t('marketplace.operator.platformSubdomainReadOnlyHint')}
            </p>
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
            {customDomainRecord ? (
              <p
                className="text-sm text-muted-foreground"
                data-testid="operator-marketplace-custom-domain-status"
              >
                {t('marketplace.operator.customDomainStatusValue', {
                  host: customDomainRecord.host,
                  status:
                    customDomainRecord.verificationStatus === 'verified'
                      ? t('marketplace.enums.domainVerification.verified')
                      : t('marketplace.enums.domainVerification.pending'),
                })}
              </p>
            ) : null}
            {!validation.customDomain ? (
              <p
                className="text-sm text-destructive"
                data-testid="operator-marketplace-custom-domain-error"
              >
                {t('marketplace.operator.validationInvalidHostname')}
              </p>
            ) : null}
            {customDomainRecord?.verificationStatus === 'pending' ? (
              <p className="text-sm text-muted-foreground">
                {t('marketplace.operator.customDomainPendingNote')}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {t('marketplace.operator.customDomainRemoveHint')}
            </p>
          </div>
        </div>

        {!isArchived ? (
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {isDirty ? (
                <Button
                  type="button"
                  variant="outline"
                  data-testid="operator-marketplace-discard"
                  disabled={isBusy}
                  onClick={handleDiscardChanges}
                >
                  {t('marketplace.operator.discardChanges')}
                </Button>
              ) : null}
              <Button
                data-testid="operator-marketplace-save"
                disabled={!canSave || isBusy}
                onClick={() => void handleSave()}
              >
                {working === 'update' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('marketplace.operator.saveSettings')}
              </Button>
            </div>

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
