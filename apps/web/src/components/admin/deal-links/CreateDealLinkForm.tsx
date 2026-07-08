'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import {
  digitalAssetsApi,
  useCurrency,
  useI18n,
  useMyListings,
  type DealLinkDeliveryType,
  type SellerDealLink,
} from '@mobazha/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useDealLinksContext } from './DealLinksContext';

export interface CreateDealLinkFormProps {
  initialProductSlug?: string;
  onCreated?: (link: SellerDealLink) => void;
  showHeader?: boolean;
}

export function CreateDealLinkForm({
  initialProductSlug = '',
  onCreated,
  showHeader = true,
}: CreateDealLinkFormProps) {
  const { t } = useI18n();
  const { formatPrice, fromMinimalUnit } = useCurrency();
  const { toast } = useToast();
  const { listings, isLoading: listingsLoading } = useMyListings();
  const { createActiveDealLink } = useDealLinksContext();

  const [selectedProductSlug, setSelectedProductSlug] = useState(initialProductSlug);
  const [deliveryType, setDeliveryType] = useState<DealLinkDeliveryType>('digital_file');
  const [digitalDeliveryReady, setDigitalDeliveryReady] = useState<boolean | null>(null);
  const [digitalDeliveryChecking, setDigitalDeliveryChecking] = useState(false);
  const [reviewDays, setReviewDays] = useState('3');
  const [creating, setCreating] = useState(false);

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

  const applyProductSlug = useCallback(
    (slug: string) => {
      setSelectedProductSlug(slug);
      setDigitalDeliveryReady(null);
      const listing = eligibleListings.find(item => item.slug === slug);
      const nextDeliveryType: DealLinkDeliveryType =
        listing?.contractType === 'SERVICE' ? 'fixed_service' : 'digital_file';
      setDeliveryType(nextDeliveryType);
      setReviewDays(nextDeliveryType === 'fixed_service' ? '7' : '3');
    },
    [eligibleListings]
  );

  useEffect(() => {
    if (initialProductSlug && eligibleListings.some(item => item.slug === initialProductSlug)) {
      applyProductSlug(initialProductSlug);
    }
  }, [applyProductSlug, eligibleListings, initialProductSlug]);

  useEffect(() => {
    if (!selectedListing) {
      setDigitalDeliveryReady(null);
      setDigitalDeliveryChecking(false);
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
  }, [selectedListing]);

  const handleSubmit = useCallback(async () => {
    const listing = eligibleListings.find(item => item.slug === selectedProductSlug);
    const parsedReviewDays = Number(reviewDays);
    const minimumReviewDays = deliveryType === 'fixed_service' ? 7 : 3;
    if (
      !listing?.cid ||
      (listing.contractType === 'DIGITAL_GOOD' && digitalDeliveryReady !== true) ||
      !Number.isInteger(parsedReviewDays) ||
      parsedReviewDays < minimumReviewDays ||
      parsedReviewDays > 365
    ) {
      toast({ variant: 'destructive', title: t('admin.dealLinks.dealCreateValidationError') });
      return;
    }

    setCreating(true);
    try {
      const currency = listing.price.currency.code;
      const created = await createActiveDealLink({
        title: listing.title,
        deliveryType,
        priceAmount: String(fromMinimalUnit(listing.price.amount, currency)),
        priceCurrency: currency,
        terms: {
          acceptanceHours: parsedReviewDays * 24,
          deliverables: [listing.title],
        },
        purchaseTemplate: {
          listingHash: listing.cid,
          quantity: '1',
          options: [],
          optionalFeatures: [],
        },
      });
      toast({ title: t('admin.dealLinks.dealCreateSuccess') });
      onCreated?.(created);
    } catch {
      toast({ variant: 'destructive', title: t('admin.dealLinks.dealCreateFailed') });
    } finally {
      setCreating(false);
    }
  }, [
    createActiveDealLink,
    deliveryType,
    digitalDeliveryReady,
    eligibleListings,
    fromMinimalUnit,
    onCreated,
    reviewDays,
    selectedProductSlug,
    t,
    toast,
  ]);

  return (
    <div className="space-y-5" data-testid="create-deal-link-form">
      {showHeader ? (
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('admin.dealLinks.dealCreateTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('admin.dealLinks.dealCreateSubtitle')}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="deal-product-select">{t('admin.dealLinks.productLabel')}</Label>
          <Select value={selectedProductSlug} onValueChange={applyProductSlug}>
            <SelectTrigger id="deal-product-select" className="min-h-11">
              <SelectValue placeholder={t('admin.dealLinks.productPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {eligibleListings.map(listing => (
                <SelectItem key={listing.slug} value={listing.slug}>
                  {listing.title} ·{' '}
                  {formatPrice(
                    fromMinimalUnit(listing.price.amount, listing.price.currency.code),
                    listing.price.currency.code
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!listingsLoading && !eligibleListings.length ? (
            <p className="text-sm text-muted-foreground">
              {t('admin.dealLinks.noEligibleProducts')}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>{t('admin.dealLinks.deliveryTypeLabel')}</Label>
          <div className="flex min-h-11 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-foreground">
            {deliveryType === 'fixed_service'
              ? t('admin.dealLinks.deliveryFixedService')
              : t('admin.dealLinks.deliveryDigitalFile')}
          </div>
          {selectedListing?.contractType === 'DIGITAL_GOOD' &&
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
      </div>

      <Button
        type="button"
        className="min-h-11 w-full sm:w-auto"
        disabled={
          creating ||
          listingsLoading ||
          digitalDeliveryChecking ||
          !eligibleListings.length ||
          (selectedListing?.contractType === 'DIGITAL_GOOD' && digitalDeliveryReady !== true)
        }
        onClick={() => void handleSubmit()}
        data-testid="admin-deal-links-create-link"
      >
        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {t('admin.dealLinks.dealCreateCta')}
      </Button>
    </div>
  );
}
