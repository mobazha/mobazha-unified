// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  MARKETPLACE_BUYER_ACCESS_MODE_KEYS,
  MARKETPLACE_CATALOG_MODE_KEYS,
  MARKETPLACE_DISCOVERABILITY_KEYS,
  MARKETPLACE_SELLER_REVIEW_MODE_KEYS,
  MARKETPLACE_SELLER_ENTRY_MODE_KEYS,
  useI18n,
} from '@mobazha/core';
import type {
  MarketplaceBuyerAccessMode,
  MarketplaceCatalogMode,
  MarketplaceDiscoverability,
  MarketplaceSellerReviewMode,
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
import { Check, Copy, Loader2 } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

interface MarketplaceSettingsFormState {
  name: string;
  description: string;
  logoURL: string;
  bannerURL: string;
  vertical: string;
  buyerAccessMode: MarketplaceBuyerAccessMode;
  sellerReviewMode: MarketplaceSellerReviewMode;
  discoverability: MarketplaceDiscoverability;
  catalogMode: MarketplaceCatalogMode;
  sellerEntryMode: MarketplaceSellerEntryMode;
  customDomain: string;
  catalogQuery: string;
  /** Operator take-rate as a percent string ("5" / "7.5"); stored as bps. */
  commissionPercent: string;
}

const COMMISSION_MAX_PERCENT = 30;

function parseCommissionPercent(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const percent = Number(trimmed);
  if (!Number.isFinite(percent) || percent < 0 || percent > COMMISSION_MAX_PERCENT) return null;
  return Math.round(percent * 100);
}

function domainHost(marketplace: NativeMarketplace, kind: 'subdomain' | 'custom'): string {
  return marketplace.domains.find(domain => domain.kind === kind)?.host ?? '';
}

function normalizeOptionalString(value: string): string {
  return value.trim();
}

function normalizeHostForCompare(value: string): string {
  return value.trim().replace(/\.+$/, '').toLowerCase();
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
  commissionPercent: boolean;
}

function validateForm(form: MarketplaceSettingsFormState): MarketplaceSettingsValidation {
  return {
    name: form.name.trim().length > 0,
    vertical: form.vertical.trim().length > 0,
    customDomain: !form.customDomain.trim() || isValidHostname(form.customDomain),
    logoURL: isValidMediaUrl(form.logoURL),
    bannerURL: isValidMediaUrl(form.bannerURL),
    commissionPercent: parseCommissionPercent(form.commissionPercent) !== null,
  };
}

function buildFormState(marketplace: NativeMarketplace): MarketplaceSettingsFormState {
  return {
    name: marketplace.name,
    description: marketplace.description ?? '',
    logoURL: marketplace.logoURL ?? '',
    bannerURL: marketplace.bannerURL ?? '',
    vertical: marketplace.vertical,
    buyerAccessMode: marketplace.buyerAccessMode,
    sellerReviewMode: marketplace.sellerReviewMode,
    discoverability: marketplace.discoverability,
    catalogMode: marketplace.catalogMode,
    sellerEntryMode: marketplace.sellerEntryMode,
    customDomain: domainHost(marketplace, 'custom'),
    catalogQuery: marketplace.catalogQuery ?? '',
    commissionPercent:
      (marketplace.operatorCommissionBps ?? 0) > 0
        ? String((marketplace.operatorCommissionBps ?? 0) / 100)
        : '',
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
  if (form.sellerReviewMode !== marketplace.sellerReviewMode) {
    payload.sellerReviewMode = form.sellerReviewMode;
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
  const commissionBps = parseCommissionPercent(form.commissionPercent);
  if (commissionBps !== null && commissionBps !== (marketplace.operatorCommissionBps ?? 0)) {
    payload.operatorCommissionBps = commissionBps;
  }

  return payload;
}

interface OperatorMarketplaceSettingsCardProps {
  marketplace: NativeMarketplace;
  working: string | null;
  customDomainsEnabled?: boolean;
  onSave: (data: UpdateNativeMarketplaceRequest) => Promise<NativeMarketplace | null>;
  onVerifyCustomDomain: () => Promise<void>;
  onArchive: () => Promise<unknown>;
}

export function OperatorMarketplaceSettingsCard({
  marketplace,
  working,
  customDomainsEnabled = true,
  onSave,
  onVerifyCustomDomain,
  onArchive,
}: OperatorMarketplaceSettingsCardProps) {
  const { t, formatDate } = useI18n();
  const isArchived = marketplace.status === 'archived';
  const isBusy = Boolean(working);
  const isVerifyingDomain = working === 'verifyCustomDomain';
  const platformSubdomain = domainHost(marketplace, 'subdomain');
  const customDomainRecord = marketplace.domains.find(domain => domain.kind === 'custom');
  const [form, setForm] = useState<MarketplaceSettingsFormState>(() => buildFormState(marketplace));
  const [copiedField, setCopiedField] = useState<'name' | 'value' | null>(null);

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
  const formCustomDomainNormalized = useMemo(
    () => normalizeHostForCompare(form.customDomain),
    [form.customDomain]
  );
  const serverCustomDomainNormalized = useMemo(
    () => normalizeHostForCompare(customDomainRecord?.host ?? ''),
    [customDomainRecord?.host]
  );
  const hasCustomDomainChanged = formCustomDomainNormalized !== serverCustomDomainNormalized;
  const customDomainMatchesServer =
    Boolean(customDomainRecord) &&
    formCustomDomainNormalized.length > 0 &&
    formCustomDomainNormalized === serverCustomDomainNormalized;
  const shouldShowSavedDomainMismatchHint = hasCustomDomainChanged && validation.customDomain;

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

  const handleCopyDnsValue = useCallback(async (field: 'name' | 'value', value?: string) => {
    if (!value) return;
    const copied = await copyToClipboard(value);
    if (!copied) return;
    setCopiedField(field);
    window.setTimeout(() => {
      setCopiedField(prev => (prev === field ? null : prev));
    }, 2000);
  }, []);

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
            <Label>{t('marketplace.operator.buyerAccessMode')}</Label>
            <Input
              data-testid="operator-marketplace-buyer-access-mode"
              value={t(MARKETPLACE_BUYER_ACCESS_MODE_KEYS[form.buyerAccessMode])}
              disabled
            />
            <p className="text-sm text-muted-foreground">
              {t('marketplace.operator.buyerAccessModeReadOnlyHint')}
            </p>
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
          <div className="space-y-2">
            <Label>{t('marketplace.operator.sellerReviewMode')}</Label>
            <Select
              value={form.sellerReviewMode}
              disabled={isArchived || isBusy}
              onValueChange={value =>
                setField('sellerReviewMode', value as MarketplaceSellerReviewMode)
              }
            >
              <SelectTrigger data-testid="operator-marketplace-seller-review-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(MARKETPLACE_SELLER_REVIEW_MODE_KEYS) as MarketplaceSellerReviewMode[]
                ).map(option => (
                  <SelectItem key={option} value={option}>
                    {t(MARKETPLACE_SELLER_REVIEW_MODE_KEYS[option])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('marketplace.operator.sellerReviewModeHint')}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="operator-commission-percent">
              {t('marketplace.operator.commissionRate', { defaultValue: 'Operator commission' })}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="operator-commission-percent"
                inputMode="decimal"
                placeholder="0"
                value={form.commissionPercent}
                disabled={isArchived || isBusy}
                onChange={event => setField('commissionPercent', event.target.value)}
                data-testid="operator-marketplace-commission-percent"
                className="max-w-[8rem]"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            {!validation.commissionPercent ? (
              <p className="text-sm text-destructive" data-testid="operator-commission-invalid">
                {t('marketplace.operator.commissionRateInvalid', {
                  defaultValue: 'Enter a rate between 0 and 30 (up to 2 decimals).',
                })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('marketplace.operator.commissionRateHint', {
                  defaultValue:
                    'Charged to sellers on orders this marketplace produces. Takes effect for new orders after you republish; sellers see the committed rate before joining.',
                })}
              </p>
            )}
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

          {customDomainsEnabled ? (
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
                <div
                  className="space-y-1 text-sm text-muted-foreground"
                  data-testid="operator-marketplace-custom-domain-status"
                >
                  <p>
                    {t('marketplace.operator.customDomainStatusValue', {
                      host: customDomainRecord.host,
                      status:
                        customDomainRecord.verificationStatus === 'verified'
                          ? t('marketplace.enums.domainVerification.verified')
                          : t('marketplace.enums.domainVerification.pending'),
                    })}
                  </p>
                  {customDomainMatchesServer &&
                  customDomainRecord.verificationStatus === 'verified' &&
                  customDomainRecord.verifiedAt ? (
                    <p data-testid="operator-marketplace-custom-domain-verified-at">
                      {t('marketplace.operator.customDomainVerifiedAt', {
                        date: formatDate(customDomainRecord.verifiedAt),
                      })}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {!validation.customDomain ? (
                <p
                  className="text-sm text-destructive"
                  data-testid="operator-marketplace-custom-domain-error"
                >
                  {t('marketplace.operator.validationInvalidHostname')}
                </p>
              ) : null}
              {shouldShowSavedDomainMismatchHint ? (
                <p
                  className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                  data-testid="operator-marketplace-custom-domain-save-first-hint"
                >
                  {t('marketplace.operator.customDomainSaveFirstHint')}
                </p>
              ) : null}
              {customDomainMatchesServer && customDomainRecord?.verificationStatus === 'pending' ? (
                <div
                  className="space-y-3 rounded-md border border-border bg-muted/30 p-3"
                  data-testid="operator-marketplace-custom-domain-dns-instructions"
                >
                  <p className="text-sm text-foreground">
                    {t('marketplace.operator.customDomainPendingNote')}
                  </p>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>
                      {t('marketplace.operator.customDomainDnsRecordTypeLabel')}:{' '}
                      <span className="font-medium text-foreground">
                        {t('marketplace.operator.customDomainDnsRecordTypeValue')}
                      </span>
                    </p>
                    <DnsRecordRow
                      label={t('marketplace.operator.customDomainDnsNameLabel')}
                      value={customDomainRecord.verificationName}
                      copied={copiedField === 'name'}
                      onCopy={() =>
                        void handleCopyDnsValue('name', customDomainRecord.verificationName)
                      }
                    />
                    <DnsRecordRow
                      label={t('marketplace.operator.customDomainDnsValueLabel')}
                      value={customDomainRecord.verificationValue}
                      copied={copiedField === 'value'}
                      onCopy={() =>
                        void handleCopyDnsValue('value', customDomainRecord.verificationValue)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('marketplace.operator.customDomainAutoRetryHint')}
                  </p>
                  {!isArchived ? (
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="operator-marketplace-custom-domain-verify"
                      disabled={isBusy}
                      onClick={() => void onVerifyCustomDomain()}
                    >
                      {isVerifyingDomain ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('marketplace.operator.customDomainVerifyNow')}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {t('marketplace.operator.customDomainRemoveHint')}
              </p>
            </div>
          ) : null}
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

interface DnsRecordRowProps {
  label: string;
  value?: string;
  copied: boolean;
  onCopy: () => void;
}

function DnsRecordRow({ label, value, copied, onCopy }: DnsRecordRowProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-1">
      <p>{label}</p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-2">
        <code className="flex-1 break-all text-foreground">{value || '--'}</code>
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          disabled={!value}
          onClick={onCopy}
          aria-label={copied ? t('common.copied') : t('common.copy')}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-primary" />
              <span className="text-primary">{t('common.copied')}</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>{t('common.copy')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
