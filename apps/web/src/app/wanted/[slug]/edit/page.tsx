// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { type FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer, AuthGuard } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ui/error-alert';
import { BuyRequestImagePicker } from '@/components/wanted/BuyRequestImagePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import { defaultWantedCoin, getWantedCoins } from '@/components/wanted/wantedCoins';
import { useBuyRequestDetail, useI18n, useUpdateBuyRequest } from '@mobazha/core';
import type { BuyRequest, CreateBuyRequestRequest, Image } from '@mobazha/core';

const TITLE_MAX_LENGTH = 250;
const DESCRIPTION_MAX_LENGTH = 1000;
/** The index refuses a request that stays open longer than this. */
const MAX_DAYS = 30;

/**
 * Editing a request the buyer published.
 *
 * An edit is not a new request: the node keeps its identifier and moves its
 * revision forward, which is what tells every index that already holds a copy
 * that this one replaces it. Only an open request can be edited — once the
 * buyer has accepted an offer the deal is in escrow and the order is its home.
 */
export default function EditWantedRequestPage() {
  return (
    <AuthGuard>
      <EditWantedRequest />
    </AuthGuard>
  );
}

function EditWantedRequest() {
  const { t } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const { request, isLoading } = useBuyRequestDetail(slug || null);
  const isOpen = !request || request.status === 'open';

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <Container size="md" className="py-8">
          <h1 className="mb-6 text-2xl font-bold">
            {t('wanted.editTitle', { defaultValue: 'Edit request' })}
          </h1>

          {isLoading || !request ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : !isOpen ? (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 p-6">
                <p className="text-muted-foreground">
                  {t('wanted.editClosed', {
                    defaultValue: 'This request is closed, so it can no longer be edited.',
                  })}
                </p>
                <Button asChild variant="outline">
                  <Link href={`/wanted/${encodeURIComponent(slug)}`}>
                    {t('common.back', { defaultValue: 'Back' })}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5 sm:p-6">
                <EditRequestForm key={request.slug} slug={slug} request={request} />
              </CardContent>
            </Card>
          )}
        </Container>
      </div>
      <Footer />
    </>
  );
}

/**
 * The form itself, mounted only once the node has answered and keyed by the
 * request it edits: the state is built from what the buyer wrote, so a different
 * request is a different form rather than the same one being filled in twice.
 */
function EditRequestForm({ slug, request }: { slug: string; request: BuyRequest }) {
  const { t } = useI18n();
  const router = useRouter();
  const updateRequest = useUpdateBuyRequest(slug);
  const coins = useMemo(() => getWantedCoins(), []);

  const [title, setTitle] = useState(request.title);
  const [quantity, setQuantity] = useState(String(request.quantity || 1));
  const [budgetAmount, setBudgetAmount] = useState(request.budget?.max?.amount ?? '');
  const [budgetCurrency, setBudgetCurrency] = useState(
    () => request.budget?.max?.currency || defaultWantedCoin(coins)
  );
  const [alsoAccept, setAlsoAccept] = useState<string[]>(() =>
    (request.acceptedCurrencies ?? []).filter(
      code => code !== (request.budget?.max?.currency ?? '')
    )
  );
  const [deliverTo, setDeliverTo] = useState(request.deliverTo ?? '');
  const [productType, setProductType] = useState(request.categorySlug ?? '');
  const [description, setDescription] = useState(request.description ?? '');
  const [images, setImages] = useState<Image[]>(() => (request.images ?? []) as Image[]);
  const [expiresInDays, setExpiresInDays] = useState(() => {
    const remaining = request.expiresAt
      ? Math.round((new Date(request.expiresAt).getTime() - Date.now()) / 86_400_000)
      : 7;
    return String(Math.min(MAX_DAYS, Math.max(1, remaining)));
  });
  const [submitFailed, setSubmitFailed] = useState(false);

  const acceptedCurrencies = useMemo(
    () => Array.from(new Set([budgetCurrency, ...alsoAccept])).filter(Boolean),
    [budgetCurrency, alsoAccept]
  );

  const canSubmit = title.trim().length > 0 && budgetAmount.trim().length > 0;

  const toggleCoin = (id: string) => {
    setAlsoAccept(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitFailed(false);

    const parsedQuantity = Number.parseInt(quantity, 10);
    const payload: CreateBuyRequestRequest = {
      title: title.trim(),
      quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1,
      budget: { amount: budgetAmount.trim(), currency: budgetCurrency },
      expiresInDays: Number.parseInt(expiresInDays, 10) || 7,
      acceptedCurrencies,
    };
    if (deliverTo.trim()) payload.shipTo = deliverTo.trim().toUpperCase();
    if (productType.trim()) payload.productType = productType.trim();
    if (description.trim()) payload.description = description.trim();
    if (images.length > 0) payload.images = images;

    try {
      await updateRequest.mutateAsync(payload);
      router.push(`/wanted/${encodeURIComponent(slug)}`);
    } catch {
      setSubmitFailed(true);
    }
  };

  return (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-title">
                      {t('wanted.newTitle', { defaultValue: 'What are you looking for?' })}
                    </Label>
                    <Input
                      id="edit-title"
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      required
                      maxLength={TITLE_MAX_LENGTH}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="edit-quantity">
                        {t('wanted.newQuantity', { defaultValue: 'How many?' })}
                      </Label>
                      <Input
                        id="edit-quantity"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={event => setQuantity(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="edit-expires">
                        {t('wanted.newExpiresDays', { defaultValue: 'Keep it up for (days)' })}
                      </Label>
                      <Input
                        id="edit-expires"
                        type="number"
                        min={1}
                        max={MAX_DAYS}
                        value={expiresInDays}
                        onChange={event => setExpiresInDays(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('wanted.newExpiresHint', { defaultValue: 'Up to 30 days.' })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="edit-budget">
                        {t('wanted.newBudget', { defaultValue: 'Your maximum price' })}
                      </Label>
                      <Input
                        id="edit-budget"
                        inputMode="decimal"
                        value={budgetAmount}
                        onChange={event => setBudgetAmount(event.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="edit-currency">
                        {t('wanted.newBudgetCurrency', { defaultValue: 'Budget currency' })}
                      </Label>
                      <Select value={budgetCurrency} onValueChange={setBudgetCurrency}>
                        <SelectTrigger id="edit-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {coins.map(coin => (
                            <SelectItem key={coin.id} value={coin.id}>
                              <span className="flex items-center gap-2">
                                <TokenIcon token={coin.id} size={16} />
                                {coin.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {coins.length > 1 && (
                    <div className="flex flex-col gap-2">
                      <Label>
                        {t('wanted.newCurrencies', { defaultValue: 'Accepted currencies' })}
                      </Label>
                      <div className="flex flex-wrap gap-2 rounded-md border border-input p-3">
                        {coins.map(coin => {
                          const checked = acceptedCurrencies.includes(coin.id);
                          const locked = coin.id === budgetCurrency;
                          return (
                            <label
                              key={coin.id}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                                checked
                                  ? 'border-primary text-foreground'
                                  : 'border-input text-muted-foreground'
                              } ${locked ? 'opacity-70' : 'cursor-pointer'}`}
                            >
                              <input
                                type="checkbox"
                                className="h-3 w-3"
                                checked={checked}
                                disabled={locked}
                                onChange={() => toggleCoin(coin.id)}
                              />
                              <TokenIcon token={coin.id} size={14} />
                              {coin.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="edit-deliver">
                        {t('wanted.newDeliverTo', { defaultValue: 'Deliver to' })} (
                        {t('common.optional', { defaultValue: 'Optional' })})
                      </Label>
                      <Input
                        id="edit-deliver"
                        value={deliverTo}
                        onChange={event => setDeliverTo(event.target.value)}
                        maxLength={2}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="edit-category">
                        {t('wanted.newCategory', { defaultValue: 'Category' })} (
                        {t('common.optional', { defaultValue: 'Optional' })})
                      </Label>
                      <Input
                        id="edit-category"
                        value={productType}
                        onChange={event => setProductType(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-details">
                      {t('wanted.newDetails', { defaultValue: 'Details (optional)' })}
                    </Label>
                    <textarea
                      id="edit-details"
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                      rows={6}
                      maxLength={DESCRIPTION_MAX_LENGTH}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <BuyRequestImagePicker images={images} onImagesChange={setImages} />

                  <ErrorAlert
                    error={
                      submitFailed
                        ? t('wanted.errorEdit', {
                            defaultValue: 'Could not save the request. Please try again.',
                          })
                        : null
                    }
                  />

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={!canSubmit || updateRequest.isPending}>
                      {updateRequest.isPending
                        ? t('wanted.editSaving', { defaultValue: 'Saving...' })
                        : t('wanted.editSubmit', { defaultValue: 'Save changes' })}
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href={`/wanted/${encodeURIComponent(slug)}`}>
                        {t('common.cancel', { defaultValue: 'Cancel' })}
                      </Link>
                    </Button>
                  </div>
                </form>
  );
}
