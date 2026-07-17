'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Info, Loader2, Lock, ShieldCheck } from 'lucide-react';
import {
  ApiError,
  digitalAssetsApi,
  activateSellerDealLink,
  createSellerDealLink,
  updateSellerDealLink,
  useCurrency,
  useI18n,
  useListing,
  useMyListings,
  type DealLinkDeliveryType,
  type DealLinkPurchaseOption,
  type SellerDealLink,
  type SellerDealLinkRequest,
} from '@mobazha/core';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ProductListingPicker } from '@/components/pickers/ProductListingPicker';
import { ProductListingSummary } from '@/components/pickers/ProductListingSummary';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

type ExpiryPreset = '24h' | '7d' | '30d' | 'forever' | 'custom';

const PRESET_MS: Record<Exclude<ExpiryPreset, 'forever' | 'custom'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// Mirrors the hosting backend's decimal validation
// (`^[0-9]+(?:\.[0-9]{1,18})?$`): a plain fixed-point positive decimal with at
// most 18 fractional digits. Loose `Number()` would wave through scientific
// (`1e3`), hex (`0x10`), signed, and over-precise inputs that the server then
// rejects — so we gate on the same shape here to fail fast and consistently.
const DECIMAL_AMOUNT_PATTERN = /^[0-9]+(?:\.[0-9]{1,18})?$/;

function isPositiveDecimalAmount(raw: string): boolean {
  const trimmed = raw.trim();
  if (!DECIMAL_AMOUNT_PATTERN.test(trimmed)) return false;
  // The pattern admits all-zero strings ("0", "0.00"); the deal price must be > 0.
  return /[1-9]/.test(trimmed);
}

/** ISO → the value a datetime-local input expects (local time, no seconds). */
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A positive integer quantity, as the purchase template stores it (a string). */
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/;

/**
 * A terms hash is a long opaque fingerprint; show enough of both ends to be
 * verifiable without pretending the whole value fits or is meaningful to read.
 */
function truncateFingerprint(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

/**
 * Map a typed hosting error to an honest, capability-specific message. Only the
 * status carried by `ApiError` is authoritative here — anything else (a network
 * failure, a plain Error) falls back to the generic operation message rather
 * than inventing a reason the backend did not give.
 */
function describeDealLinkError(
  error: unknown,
  t: (key: string, params?: Record<string, string | number>) => string,
  fallbackKey: string
): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return t('admin.dealLinks.dealErrorDenied');
    if (error.status === 404) return t('admin.dealLinks.dealErrorGone');
    if (error.status === 409 || error.status === 422) {
      return t('admin.dealLinks.dealErrorConflict');
    }
  }
  return t(fallbackKey);
}

export interface CreateDealLinkFormProps {
  initialProductSlug?: string;
  /** When set, the form edits this link (product locked) and saves a revision. */
  editLink?: SellerDealLink;
  onCreated?: (link: SellerDealLink) => void;
  /**
   * Called when creation persisted a draft but activation failed. The draft is
   * recoverable (editable / re-activatable) from the list, so the caller should
   * route the seller there rather than treat it as a total failure.
   */
  onDraftSaved?: (link: SellerDealLink) => void;
  onSaved?: (link: SellerDealLink) => void;
  showHeader?: boolean;
}

export function CreateDealLinkForm({
  initialProductSlug = '',
  editLink,
  onCreated,
  onDraftSaved,
  onSaved,
  showHeader = true,
}: CreateDealLinkFormProps) {
  const { t } = useI18n();
  const { fromMinimalUnit } = useCurrency();
  const { toast } = useToast();
  const { listings, isLoading: listingsLoading } = useMyListings();

  const isEditing = Boolean(editLink);

  const [selectedProductSlug, setSelectedProductSlug] = useState(initialProductSlug);
  const [deliveryType, setDeliveryType] = useState<DealLinkDeliveryType>(
    // Only 'fixed_service' and 'digital_file' drive review-day minimums here;
    // anything else (incl. the normalizer's 'unknown' fallback) reads as digital.
    editLink?.deliveryType === 'fixed_service' ? 'fixed_service' : 'digital_file'
  );
  const [digitalDeliveryReady, setDigitalDeliveryReady] = useState<boolean | null>(null);
  const [digitalDeliveryChecking, setDigitalDeliveryChecking] = useState(false);
  const [reviewDays, setReviewDays] = useState(
    editLink ? String(Math.round((editLink.terms.acceptanceHours ?? 72) / 24)) : '3'
  );
  const [price, setPrice] = useState(editLink?.priceAmount ?? '');
  const [note, setNote] = useState(editLink?.description ?? '');
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>(
    editLink?.expiresAt ? 'custom' : 'forever'
  );
  const [customExpiry, setCustomExpiry] = useState(
    editLink?.expiresAt ? toDatetimeLocalValue(editLink.expiresAt) : ''
  );
  const [quantity, setQuantity] = useState(editLink?.purchaseTemplate?.quantity ?? '1');
  // option name → chosen variant. Seeded from a saved template when editing, and
  // (re)seeded from the product's option catalog once the listing detail loads.
  const [optionSelections, setOptionSelections] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const option of editLink?.purchaseTemplate?.options ?? []) {
      seed[option.name] = option.value;
    }
    return seed;
  });
  const [saving, setSaving] = useState(false);

  const eligibleListings = useMemo(
    () =>
      listings.filter(
        listing =>
          (listing.status ?? 'published') === 'published' &&
          Boolean(listing.cid) &&
          !listing.priceHasRange &&
          (listing.contractType === 'DIGITAL_GOOD' || listing.contractType === 'SERVICE')
      ),
    [listings]
  );

  const selectedListing = useMemo(
    () => eligibleListings.find(item => item.slug === selectedProductSlug),
    [eligibleListings, selectedProductSlug]
  );

  // When editing, the template is bound to a listing hash, not a slug. Keep the
  // matching list item for the locked-product summary and its slug for loading
  // the option catalog. If the live listing changed, the saved title/hash still
  // provide an honest fallback instead of pretending the current product matches.
  const editListing = useMemo(() => {
    const hash = editLink?.purchaseTemplate?.listingHash;
    if (!hash) return undefined;
    return listings.find(item => item.cid === hash);
  }, [editLink, listings]);
  const editListingSlug = editListing?.slug ?? null;
  const lockedListingHash = editLink?.purchaseTemplate?.listingHash;

  // Load the full listing so we can offer its variant options. The list index
  // (`useMyListings`) carries no options, so this is the only place they can be
  // represented; when it is unavailable we preserve any saved options untouched.
  const detailSlug = isEditing ? editListingSlug : selectedProductSlug || null;
  const { listing: productDetail } = useListing(detailSlug);
  const productOptions = useMemo(() => productDetail?.item.options ?? [], [productDetail]);

  const optionSeedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = productDetail?.slug ?? null;
    if (!key || key === optionSeedKeyRef.current) return;
    optionSeedKeyRef.current = key;
    const options = productDetail?.item.options ?? [];
    if (!options.length) return;
    // Keep a still-valid saved/prior choice; otherwise default to the first
    // variant so a quick create stays one click, and edits stay pre-filled.
    setOptionSelections(prev => {
      const next: Record<string, string> = {};
      for (const option of options) {
        const prior = prev[option.name];
        next[option.name] =
          prior && option.variants.some(variant => variant.name === prior)
            ? prior
            : (option.variants[0]?.name ?? '');
      }
      return next;
    });
  }, [productDetail]);

  const buildPurchaseOptions = useCallback((): DealLinkPurchaseOption[] => {
    if (productOptions.length) {
      return productOptions.map(option => ({
        name: option.name,
        value: optionSelections[option.name] ?? '',
      }));
    }
    // No option catalog to edit against: preserve what the link already had
    // (editing) or send none (creating). Never fabricate a selection.
    return isEditing ? (editLink?.purchaseTemplate?.options ?? []) : [];
  }, [editLink, isEditing, optionSelections, productOptions]);

  // Saved options we cannot re-render as pickers (editing, but the catalog did
  // not load). We still preserve them on save; surface that they are locked.
  const lockedSavedOptions =
    isEditing && !productOptions.length ? (editLink?.purchaseTemplate?.options ?? []) : [];

  const applyProductSlug = useCallback(
    (slug: string) => {
      setSelectedProductSlug(slug);
      setDigitalDeliveryReady(null);
      const listing = eligibleListings.find(item => item.slug === slug);
      const nextDeliveryType: DealLinkDeliveryType =
        listing?.contractType === 'SERVICE' ? 'fixed_service' : 'digital_file';
      setDeliveryType(nextDeliveryType);
      setReviewDays(nextDeliveryType === 'fixed_service' ? '7' : '3');
      // Default the deal price to the current list price; the seller can adjust
      // it to whatever was agreed for this specific deal.
      if (listing) {
        setPrice(String(fromMinimalUnit(listing.price.amount, listing.price.currency.code)));
      }
    },
    [eligibleListings, fromMinimalUnit]
  );

  useEffect(() => {
    if (
      !isEditing &&
      initialProductSlug &&
      eligibleListings.some(item => item.slug === initialProductSlug)
    ) {
      applyProductSlug(initialProductSlug);
    }
  }, [applyProductSlug, eligibleListings, initialProductSlug, isEditing]);

  useEffect(() => {
    // Editing keeps the original product, already validated at creation.
    if (isEditing || !selectedListing) {
      if (!isEditing) {
        setDigitalDeliveryReady(null);
        setDigitalDeliveryChecking(false);
      }
      return;
    }
    if (selectedListing.contractType === 'SERVICE') {
      setDigitalDeliveryReady(true);
      setDigitalDeliveryChecking(false);
      return;
    }

    let cancelled = false;
    setDigitalDeliveryChecking(true);
    void digitalAssetsApi
      .listAssets(selectedListing.slug)
      .then(assets => {
        if (cancelled) return;
        setDigitalDeliveryReady(
          assets.some(asset => asset.assetType === 'file' || asset.assetType === 'link')
        );
      })
      .catch(() => {
        if (!cancelled) setDigitalDeliveryReady(false);
      })
      .finally(() => {
        if (!cancelled) setDigitalDeliveryChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditing, selectedListing]);

  const currency = editLink?.priceCurrency ?? selectedListing?.price.currency.code ?? 'USD';

  const computeExpiresAt = useCallback((): { value?: string; invalid: boolean } => {
    if (expiryPreset === 'forever') return { value: undefined, invalid: false };
    if (expiryPreset === 'custom') {
      const date = new Date(customExpiry);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return { invalid: true };
      return { value: date.toISOString(), invalid: false };
    }
    return { value: new Date(Date.now() + PRESET_MS[expiryPreset]).toISOString(), invalid: false };
  }, [customExpiry, expiryPreset]);

  const handleSubmit = useCallback(async () => {
    const parsedReviewDays = Number(reviewDays);
    const minimumReviewDays = deliveryType === 'fixed_service' ? 7 : 3;
    const expiry = computeExpiresAt();
    const trimmedQuantity = quantity.trim();
    // Every rendered option must have a chosen variant before we can freeze it.
    const optionsComplete = productOptions.every(
      option => (optionSelections[option.name] ?? '').length > 0
    );

    if (
      !isPositiveDecimalAmount(price) ||
      !Number.isInteger(parsedReviewDays) ||
      parsedReviewDays < minimumReviewDays ||
      parsedReviewDays > 365 ||
      !POSITIVE_INTEGER_PATTERN.test(trimmedQuantity) ||
      !optionsComplete ||
      expiry.invalid
    ) {
      toast({ variant: 'destructive', title: t('admin.dealLinks.dealCreateValidationError') });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editLink) {
        if (!editLink.purchaseTemplate) {
          toast({ variant: 'destructive', title: t('admin.dealLinks.dealEditFailed') });
          return;
        }
        const body: SellerDealLinkRequest = {
          title: editLink.title,
          description: note.trim() || undefined,
          deliveryType,
          priceAmount: price,
          priceCurrency: editLink.priceCurrency,
          terms: {
            acceptanceHours: parsedReviewDays * 24,
            deliverables: editLink.terms.deliverables?.length
              ? editLink.terms.deliverables
              : [editLink.title],
          },
          purchaseTemplate: {
            ...editLink.purchaseTemplate,
            quantity: trimmedQuantity,
            options: buildPurchaseOptions(),
          },
          expiresAt: expiry.value,
        };
        const saved = await updateSellerDealLink(editLink.id, body);
        toast({ title: t('admin.dealLinks.dealEditSuccess') });
        onSaved?.(saved);
        return;
      }

      const listing = eligibleListings.find(item => item.slug === selectedProductSlug);
      if (
        !listing?.cid ||
        (listing.contractType === 'DIGITAL_GOOD' && digitalDeliveryReady !== true)
      ) {
        toast({ variant: 'destructive', title: t('admin.dealLinks.dealCreateValidationError') });
        return;
      }
      // Create and activate are two steps. Keep them separate so a failure in
      // the second one is reported honestly: the draft is already persisted, so
      // rather than a blank "create failed" we tell the seller it was saved and
      // hand them back to the list, where the draft can be retried or edited.
      let draft;
      try {
        draft = await createSellerDealLink({
          title: listing.title,
          description: note.trim() || undefined,
          deliveryType,
          priceAmount: price,
          priceCurrency: listing.price.currency.code,
          terms: {
            acceptanceHours: parsedReviewDays * 24,
            deliverables: [listing.title],
          },
          purchaseTemplate: {
            listingHash: listing.cid,
            quantity: trimmedQuantity,
            options: buildPurchaseOptions(),
            optionalFeatures: [],
          },
          expiresAt: expiry.value,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: describeDealLinkError(error, t, 'admin.dealLinks.dealCreateFailed'),
        });
        return;
      }
      try {
        const created = await activateSellerDealLink(draft.id);
        toast({ title: t('admin.dealLinks.dealCreateSuccess') });
        onCreated?.(created);
      } catch {
        toast({
          variant: 'destructive',
          title: t('admin.dealLinks.draftSavedActivateFailed'),
        });
        onDraftSaved?.(draft);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: describeDealLinkError(
          error,
          t,
          isEditing ? 'admin.dealLinks.dealEditFailed' : 'admin.dealLinks.dealCreateFailed'
        ),
      });
    } finally {
      setSaving(false);
    }
  }, [
    buildPurchaseOptions,
    computeExpiresAt,
    deliveryType,
    digitalDeliveryReady,
    editLink,
    eligibleListings,
    isEditing,
    note,
    onCreated,
    onDraftSaved,
    onSaved,
    optionSelections,
    price,
    productOptions,
    quantity,
    reviewDays,
    selectedProductSlug,
    t,
    toast,
  ]);

  const submitDisabled =
    saving ||
    (!isEditing &&
      (listingsLoading ||
        digitalDeliveryChecking ||
        !eligibleListings.length ||
        (selectedListing?.contractType === 'DIGITAL_GOOD' && digitalDeliveryReady !== true)));

  return (
    <div className="space-y-5" data-testid="create-deal-link-form">
      {showHeader ? (
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t(isEditing ? 'admin.dealLinks.dealEditTitle' : 'admin.dealLinks.dealCreateTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              isEditing ? 'admin.dealLinks.dealEditSubtitle' : 'admin.dealLinks.dealCreateSubtitle'
            )}
          </p>
        </div>
      ) : null}

      <div
        className="flex gap-2.5 rounded-lg border border-border bg-muted/30 p-3"
        data-testid="deal-link-what-is"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('admin.dealLinks.whatIsTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('admin.dealLinks.whatIsBody')}</p>
        </div>
      </div>

      {isEditing && editLink ? (
        <div
          className="space-y-1.5 rounded-lg border border-border p-3"
          data-testid="deal-link-revision-summary"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-sm font-medium">{t('admin.dealLinks.revisionSummaryTitle')}</span>
            <span className="text-xs text-muted-foreground">
              {t('admin.dealLinks.revisionLabel')}:{' '}
              <span className="font-medium text-foreground">
                {t('admin.dealLinks.revisionValue', { revision: editLink.currentRevision })}
              </span>
            </span>
            {editLink.termsHash ? (
              <span className="text-xs text-muted-foreground">
                {t('admin.dealLinks.termsHashLabel')}:{' '}
                <span
                  className="font-mono text-foreground"
                  title={editLink.termsHash}
                  data-testid="deal-link-terms-hash"
                >
                  {truncateFingerprint(editLink.termsHash)}
                </span>
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('admin.dealLinks.revisionSummaryHint')}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <div className="flex min-h-6 items-center justify-between gap-3">
            <Label htmlFor={isEditing ? undefined : 'deal-product-select'}>
              {t('admin.dealLinks.productLabel')}
            </Label>
            {isEditing ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                data-testid="deal-link-product-locked-badge"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {t('admin.dealLinks.productLockedLabel')}
              </span>
            ) : null}
          </div>
          {isEditing ? (
            <div
              className="rounded-lg border border-border bg-muted/20 p-3"
              role="group"
              aria-label={t('admin.dealLinks.productLabel')}
              data-testid="deal-link-locked-product"
            >
              <ProductListingSummary
                listing={editListing}
                fallbackTitle={editLink?.title}
                variant="locked"
              />
              {lockedListingHash ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3 text-xs">
                  <span className="text-muted-foreground">
                    {t('admin.dealLinks.productVersionLabel')}:
                  </span>
                  <code
                    className="font-mono text-foreground"
                    title={lockedListingHash}
                    data-testid="deal-link-product-version"
                  >
                    {truncateFingerprint(lockedListingHash)}
                  </code>
                </div>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {t('admin.dealLinks.productLockedHint')}
              </p>
              {!listingsLoading && lockedListingHash && !editListing ? (
                <p
                  className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/20 bg-warning/10 px-2.5 py-2 text-xs text-warning"
                  data-testid="deal-link-product-version-warning"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{t('admin.dealLinks.productVersionUnavailable')}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <ProductListingPicker
              id="deal-product-select"
              listings={eligibleListings}
              value={selectedProductSlug}
              onValueChange={applyProductSlug}
              loading={listingsLoading}
            />
          )}
          {!isEditing && !listingsLoading && !eligibleListings.length ? (
            <p className="text-sm text-muted-foreground">
              {t('admin.dealLinks.noEligibleProducts')}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="deal-price">{t('admin.dealLinks.priceLabel')}</Label>
          <Input
            id="deal-price"
            inputMode="decimal"
            value={price}
            onChange={event => setPrice(event.target.value)}
            className="min-h-11"
            disabled={!isEditing && !selectedListing}
          />
          <p className="text-xs text-muted-foreground">
            {t('admin.dealLinks.priceHint', { currency })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deal-quantity">{t('admin.dealLinks.quantityLabel')}</Label>
          <Input
            id="deal-quantity"
            inputMode="numeric"
            value={quantity}
            onChange={event => setQuantity(event.target.value)}
            className="min-h-11"
            disabled={!isEditing && !selectedListing}
            data-testid="deal-quantity"
          />
          <p className="text-xs text-muted-foreground">{t('admin.dealLinks.quantityHint')}</p>
        </div>

        <div className="space-y-2">
          <Label>{t('admin.dealLinks.deliveryTypeLabel')}</Label>
          <div className="flex min-h-11 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-foreground">
            {deliveryType === 'fixed_service'
              ? t('admin.dealLinks.deliveryFixedService')
              : t('admin.dealLinks.deliveryDigitalFile')}
          </div>
          {!isEditing &&
          selectedListing?.contractType === 'DIGITAL_GOOD' &&
          !digitalDeliveryChecking &&
          digitalDeliveryReady === false ? (
            <p className="text-xs text-destructive">{t('admin.dealLinks.noEligibleProducts')}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="deal-review-days">{t('admin.dealLinks.reviewDaysLabel')}</Label>
          <Input
            id="deal-review-days"
            inputMode="numeric"
            value={reviewDays}
            onChange={event => setReviewDays(event.target.value)}
            className="min-h-11"
          />
          <p className="text-xs text-muted-foreground">
            {deliveryType === 'fixed_service'
              ? t('admin.dealLinks.reviewDaysServiceHint')
              : t('admin.dealLinks.reviewDaysDigitalHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deal-expiry">{t('admin.dealLinks.expiryLabel')}</Label>
          <Select
            value={expiryPreset}
            onValueChange={value => setExpiryPreset(value as ExpiryPreset)}
          >
            <SelectTrigger id="deal-expiry" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{t('admin.dealLinks.expiry24h')}</SelectItem>
              <SelectItem value="7d">{t('admin.dealLinks.expiry7d')}</SelectItem>
              <SelectItem value="30d">{t('admin.dealLinks.expiry30d')}</SelectItem>
              <SelectItem value="forever">{t('admin.dealLinks.expiryForever')}</SelectItem>
              <SelectItem value="custom">{t('admin.dealLinks.expiryCustom')}</SelectItem>
            </SelectContent>
          </Select>
          {expiryPreset === 'custom' ? (
            <Input
              type="datetime-local"
              value={customExpiry}
              onChange={event => setCustomExpiry(event.target.value)}
              className="min-h-11"
              data-testid="deal-expiry-custom"
            />
          ) : null}
        </div>

        {productOptions.length ? (
          <div className="space-y-3 md:col-span-2" data-testid="deal-link-options">
            {productOptions.map(option => (
              <div key={option.name} className="space-y-2">
                <Label htmlFor={`deal-option-${option.name}`}>{option.name}</Label>
                <Select
                  value={optionSelections[option.name] ?? ''}
                  onValueChange={value =>
                    setOptionSelections(prev => ({ ...prev, [option.name]: value }))
                  }
                >
                  <SelectTrigger id={`deal-option-${option.name}`} className="min-h-11">
                    <SelectValue placeholder={t('admin.dealLinks.optionSelectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {option.variants.map(variant => (
                      <SelectItem key={variant.name} value={variant.name}>
                        {variant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        ) : null}

        {lockedSavedOptions.length ? (
          <div className="space-y-1.5 md:col-span-2" data-testid="deal-link-options-locked">
            <p className="text-xs text-muted-foreground">
              {t('admin.dealLinks.optionsLockedNote')}
            </p>
            <div className="flex flex-wrap gap-2">
              {lockedSavedOptions.map(option => (
                <span
                  key={option.name}
                  className="inline-flex items-center rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-foreground"
                >
                  {option.name}: {option.value}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="deal-note">{t('admin.dealLinks.noteLabel')}</Label>
          <Textarea
            id="deal-note"
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder={t('admin.dealLinks.notePlaceholder')}
            rows={2}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t('admin.dealLinks.sharingNotice')}</p>

      <Button
        type="button"
        className="min-h-11 w-full sm:w-auto"
        disabled={submitDisabled}
        onClick={() => void handleSubmit()}
        data-testid="admin-deal-links-create-link"
      >
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {t(isEditing ? 'admin.dealLinks.dealEditCta' : 'admin.dealLinks.dealCreateCta')}
      </Button>
    </div>
  );
}
