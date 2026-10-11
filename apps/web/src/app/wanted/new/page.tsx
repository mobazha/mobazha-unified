// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useCreateBuyRequest, useI18n } from '@mobazha/core';
import type { CreateBuyRequestRequest, Image } from '@mobazha/core';

/** A buyer hands over a brief, so the title gets room for a full spec. */
const TITLE_MAX_LENGTH = 250;
const DESCRIPTION_MAX_LENGTH = 1000;

export default function NewWantedRequestPage() {
  return (
    <AuthGuard>
      <NewWantedRequestForm />
    </AuthGuard>
  );
}

function NewWantedRequestForm() {
  const { t } = useI18n();
  const router = useRouter();
  const createRequest = useCreateBuyRequest();

  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [budgetAmount, setBudgetAmount] = useState('');
  // What this node can be paid in, read when the form renders: the same list
  // the payment settings offer, so a request is never written in a currency its
  // seller cannot receive.
  const coins = useMemo(() => getWantedCoins(), []);
  const [budgetCurrency, setBudgetCurrency] = useState(() => defaultWantedCoin(coins));
  const [alsoAccept, setAlsoAccept] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [deliverTo, setDeliverTo] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<Image[]>([]);
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
    if (categorySlug.trim()) payload.productType = categorySlug.trim();
    if (description.trim()) payload.description = description.trim();
    if (images.length > 0) payload.images = images;

    try {
      const created = await createRequest.mutateAsync(payload);
      router.push(`/wanted/${encodeURIComponent(created.slug)}`);
    } catch {
      setSubmitFailed(true);
    }
  };

  const publishError = submitFailed
    ? t('wanted.errorPublish', {
        defaultValue: 'Could not publish the request. Please try again.',
      })
    : null;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <Container size="md" className="py-8">
          <h1 className="text-3xl font-bold mb-8">
            {t('wanted.newTitle', { defaultValue: 'What are you looking for?' })}
          </h1>

          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="wanted-title">
                    {t('wanted.newTitle', { defaultValue: 'What are you looking for?' })}
                  </Label>
                  <Input
                    id="wanted-title"
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    required
                    maxLength={TITLE_MAX_LENGTH}
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {title.length}/{TITLE_MAX_LENGTH}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="wanted-quantity">
                      {t('wanted.newQuantity', { defaultValue: 'How many?' })}
                    </Label>
                    <Input
                      id="wanted-quantity"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={event => setQuantity(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="wanted-expires">
                      {t('wanted.newExpiresDays', { defaultValue: 'Keep it up for (days)' })}
                    </Label>
                    <Input
                      id="wanted-expires"
                      type="number"
                      min={1}
                      max={30}
                      value={expiresInDays}
                      onChange={event => setExpiresInDays(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('wanted.newExpiresHint', { defaultValue: 'Up to 30 days.' })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="wanted-budget">
                      {t('wanted.newBudget', { defaultValue: 'Your maximum price' })}
                    </Label>
                    <Input
                      id="wanted-budget"
                      inputMode="decimal"
                      value={budgetAmount}
                      onChange={event => setBudgetAmount(event.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="wanted-currency">
                      {t('wanted.newBudgetCurrency', { defaultValue: 'Budget currency' })}
                    </Label>
                    <Select value={budgetCurrency} onValueChange={setBudgetCurrency}>
                      <SelectTrigger id="wanted-currency">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="wanted-deliver">
                      {t('wanted.newDeliverTo', { defaultValue: 'Deliver to' })} (
                      {t('common.optional', { defaultValue: 'Optional' })})
                    </Label>
                    <Input
                      id="wanted-deliver"
                      value={deliverTo}
                      onChange={event => setDeliverTo(event.target.value)}
                      maxLength={2}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="wanted-category">
                      {t('wanted.newCategory', { defaultValue: 'Category' })} (
                      {t('common.optional', { defaultValue: 'Optional' })})
                    </Label>
                    <Input
                      id="wanted-category"
                      value={categorySlug}
                      onChange={event => setCategorySlug(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="wanted-details">
                    {t('wanted.newDetails', { defaultValue: 'Details (optional)' })}
                  </Label>
                  <textarea
                    id="wanted-details"
                    value={description}
                    onChange={event => setDescription(event.target.value)}
                    rows={6}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {description.length}/{DESCRIPTION_MAX_LENGTH}
                  </p>
                </div>

                <BuyRequestImagePicker images={images} onImagesChange={setImages} />

                <p className="text-xs text-muted-foreground">
                  {t('wanted.newPrivacyNotice', {
                    defaultValue:
                      'A request is public. It is published with your node identity, ' +
                      'and sellers see your title, budget and the country it must reach.',
                  })}
                </p>

                <ErrorAlert error={publishError} />

                <Button type="submit" disabled={!canSubmit || createRequest.isPending}>
                  {createRequest.isPending
                    ? t('wanted.newSubmitting', { defaultValue: 'Publishing...' })
                    : t('wanted.newSubmit', { defaultValue: 'Publish request' })}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Container>
      </div>
      <Footer />
    </>
  );
}
