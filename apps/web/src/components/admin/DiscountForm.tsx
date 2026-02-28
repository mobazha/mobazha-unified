'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useI18n, discountsApi, collectionsApi } from '@mobazha/core';
import type { Discount, DiscountCode, Collection } from '@mobazha/core';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

type DiscountMethod = 'code' | 'automatic';
type ValueType = 'percentage' | 'fixed_amount' | 'free_shipping';
type AppliesTo = 'all' | 'specific_products' | 'specific_collections';

interface DiscountFormProps {
  initial?: Discount;
  onSave: (data: Partial<Discount>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function DiscountForm({ initial, onSave, onCancel, saving }: DiscountFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [method, setMethod] = useState<DiscountMethod>(initial?.method || 'code');
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [valueType, setValueType] = useState<ValueType>(initial?.valueType || 'percentage');
  const [value, setValue] = useState(initial?.value ?? '0');
  const [currency, setCurrency] = useState(initial?.currency || 'USD');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(initial?.maxDiscountAmount ?? '');
  const [minAmount, setMinAmount] = useState(initial?.minAmount ?? '');
  const [appliesTo, setAppliesTo] = useState<AppliesTo>((initial?.appliesTo as AppliesTo) || 'all');
  const [productIDs, setProductIDs] = useState(initial?.productIDs?.join(', ') || '');
  const [collectionIDs, setCollectionIDs] = useState<string[]>(initial?.collectionIDs || []);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);

  useEffect(() => {
    collectionsApi
      .listPublishedCollections(1, 100)
      .then(res => setAllCollections(res.data || []))
      .catch(() => {});
  }, []);
  const [usageLimit, setUsageLimit] = useState(initial?.usageLimit ?? 0);
  const [perCustomerLimit, setPerCustomerLimit] = useState(initial?.perCustomerLimit ?? 0);
  const [combinesWithProduct, setCombinesWithProduct] = useState(
    initial?.combinesWithProduct ?? true
  );
  const [combinesWithOrder, setCombinesWithOrder] = useState(initial?.combinesWithOrder ?? false);
  const [combinesWithShipping, setCombinesWithShipping] = useState(
    initial?.combinesWithShipping ?? true
  );
  const [startsAt, setStartsAt] = useState(initial?.startsAt ? initial.startsAt.slice(0, 16) : '');
  const [endsAt, setEndsAt] = useState(initial?.endsAt ? initial.endsAt.slice(0, 16) : '');

  // Discount codes
  const [codes, setCodes] = useState<DiscountCode[]>(initial?.codes || []);
  const [newCode, setNewCode] = useState('');
  const [addingCode, setAddingCode] = useState(false);

  const handleAddCode = useCallback(async () => {
    const code = newCode.trim().toUpperCase();
    if (!code) return;

    if (initial?.id) {
      try {
        setAddingCode(true);
        const added = await discountsApi.addDiscountCodes(initial.id, [code]);
        setCodes(prev => [...prev, ...added]);
        setNewCode('');
      } catch {
        toast({ variant: 'destructive', title: t('admin.discounts.codeAddError') });
      } finally {
        setAddingCode(false);
      }
    } else {
      setCodes(prev => [
        ...prev,
        { id: `temp-${Date.now()}`, discountID: '', code, usageCount: 0, createdAt: '' },
      ]);
      setNewCode('');
    }
  }, [newCode, initial?.id, t, toast]);

  const handleRemoveCode = useCallback(
    async (codeEntry: DiscountCode) => {
      if (initial?.id && !codeEntry.id.startsWith('temp-')) {
        try {
          await discountsApi.deleteDiscountCode(initial.id, codeEntry.id);
        } catch {
          toast({ variant: 'destructive', title: t('admin.discounts.codeDeleteError') });
          return;
        }
      }
      setCodes(prev => prev.filter(c => c.id !== codeEntry.id));
    },
    [initial?.id, t, toast]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const data: Partial<Discount> = {
        title,
        description,
        method,
        valueType,
        value: String(value),
        currency,
        maxDiscountAmount: maxDiscountAmount || undefined,
        minPurchaseType: minAmount ? 'min_amount' : 'none',
        minAmount: minAmount || undefined,
        appliesTo,
        productIDs:
          appliesTo === 'specific_products'
            ? productIDs
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
            : [],
        collectionIDs: appliesTo === 'specific_collections' ? collectionIDs : [],
        usageLimit: Number(usageLimit),
        perCustomerLimit: Number(perCustomerLimit),
        combinesWithProduct,
        combinesWithOrder,
        combinesWithShipping,
        startsAt: startsAt ? new Date(startsAt).toISOString() : '',
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      };
      if (!initial?.id && method === 'code' && codes.length > 0) {
        data.codes = codes.map(c => ({ ...c, id: '', discountID: '' }));
      }
      await onSave(data);
    },
    [
      title,
      description,
      method,
      valueType,
      value,
      currency,
      maxDiscountAmount,
      minAmount,
      appliesTo,
      productIDs,
      collectionIDs,
      usageLimit,
      perCustomerLimit,
      combinesWithProduct,
      combinesWithOrder,
      combinesWithShipping,
      startsAt,
      endsAt,
      onSave,
      initial?.id,
      codes,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Method */}
      <Card className="p-4 space-y-3">
        <Label className="text-sm font-semibold">{t('admin.discounts.method')}</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="method"
              checked={method === 'code'}
              onChange={() => setMethod('code')}
              className="accent-primary"
            />
            <span className="text-sm">{t('admin.discounts.methodCode')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="method"
              checked={method === 'automatic'}
              onChange={() => setMethod('automatic')}
              className="accent-primary"
            />
            <span className="text-sm">{t('admin.discounts.methodAutomatic')}</span>
          </label>
        </div>
      </Card>

      {/* Title & Note */}
      <Card className="p-4 space-y-3">
        <div>
          <Label htmlFor="title">{t('admin.discounts.titleLabel')}</Label>
          <Input
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('admin.discounts.titlePlaceholder')}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">{t('admin.discounts.descriptionLabel')}</Label>
          <Input
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('admin.discounts.descriptionPlaceholder')}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('admin.discounts.descriptionHint')}
          </p>
        </div>
      </Card>

      {/* Value */}
      <Card className="p-4 space-y-3">
        <Label className="text-sm font-semibold">{t('admin.discounts.valueSection')}</Label>
        <div className="flex gap-4 flex-wrap">
          {(['percentage', 'fixed_amount', 'free_shipping'] as ValueType[]).map(vt => (
            <label key={vt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="valueType"
                checked={valueType === vt}
                onChange={() => setValueType(vt)}
                className="accent-primary"
              />
              <span className="text-sm">{t(`admin.discounts.valueType_${vt}`)}</span>
            </label>
          ))}
        </div>
        {valueType !== 'free_shipping' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="value">{t('admin.discounts.valueLabel')}</Label>
              <Input
                id="value"
                type="number"
                min={0}
                max={valueType === 'percentage' ? 99 : undefined}
                value={value || ''}
                onChange={e => setValue(e.target.value)}
              />
            </div>
            {valueType === 'percentage' && (
              <div>
                <Label htmlFor="maxDiscount">{t('admin.discounts.maxDiscountAmount')}</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  min={0}
                  value={maxDiscountAmount || ''}
                  onChange={e => setMaxDiscountAmount(e.target.value)}
                  placeholder={t('admin.discounts.optional')}
                />
              </div>
            )}
          </div>
        )}
        {valueType === 'fixed_amount' && (
          <div className="max-w-[200px]">
            <Label htmlFor="currency">{t('admin.discounts.currencyLabel')}</Label>
            <Input
              id="currency"
              value={currency}
              onChange={e => setCurrency(e.target.value.toUpperCase())}
            />
          </div>
        )}
      </Card>

      {/* Minimum purchase */}
      <Card className="p-4 space-y-3">
        <Label className="text-sm font-semibold">{t('admin.discounts.minimumPurchase')}</Label>
        <Input
          type="number"
          min={0}
          value={minAmount || ''}
          onChange={e => setMinAmount(e.target.value)}
          placeholder={t('admin.discounts.minimumPurchasePlaceholder')}
        />
      </Card>

      {/* Product scope */}
      <Card className="p-4 space-y-3">
        <Label className="text-sm font-semibold">{t('admin.discounts.appliesTo')}</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="scope"
              checked={appliesTo === 'all'}
              onChange={() => setAppliesTo('all')}
              className="accent-primary"
            />
            <span className="text-sm">{t('admin.discounts.scopeAll')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="scope"
              checked={appliesTo === 'specific_products'}
              onChange={() => setAppliesTo('specific_products')}
              className="accent-primary"
            />
            <span className="text-sm">{t('admin.discounts.scopeSpecific')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="scope"
              checked={appliesTo === 'specific_collections'}
              onChange={() => setAppliesTo('specific_collections')}
              className="accent-primary"
            />
            <span className="text-sm">{t('admin.discounts.scopeCollections')}</span>
          </label>
        </div>
        {appliesTo === 'specific_products' && (
          <div>
            <Label>{t('admin.discounts.productSlugsLabel')}</Label>
            <Input
              value={productIDs}
              onChange={e => setProductIDs(e.target.value)}
              placeholder={t('admin.discounts.productSlugsPlaceholder')}
            />
          </div>
        )}
        {appliesTo === 'specific_collections' && (
          <div className="space-y-2">
            <Label>{t('admin.discounts.collectionIDsLabel')}</Label>
            {allCollections.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.collections.emptyTitle')}</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                {allCollections.map(c => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={collectionIDs.includes(c.id)}
                      onCheckedChange={checked => {
                        setCollectionIDs(prev =>
                          checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                        );
                      }}
                    />
                    <span className="text-sm truncate">{c.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Usage limits */}
      <Card className="p-4 space-y-3">
        <Label className="text-sm font-semibold">{t('admin.discounts.usageLimits')}</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('admin.discounts.totalUsageLimit')}</Label>
            <Input
              type="number"
              min={0}
              value={usageLimit || ''}
              onChange={e => setUsageLimit(Number(e.target.value))}
              placeholder={t('admin.discounts.unlimited')}
            />
          </div>
          <div>
            <Label>{t('admin.discounts.perCustomerLimit')}</Label>
            <Input
              type="number"
              min={0}
              value={perCustomerLimit || ''}
              onChange={e => setPerCustomerLimit(Number(e.target.value))}
              placeholder={t('admin.discounts.unlimited')}
            />
          </div>
        </div>
      </Card>

      {/* Combinations */}
      <Card className="p-4 space-y-3">
        <Label className="text-sm font-semibold">{t('admin.discounts.combinations')}</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={combinesWithProduct}
              onCheckedChange={v => setCombinesWithProduct(!!v)}
            />
            <span className="text-sm">{t('admin.discounts.combinesProduct')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={combinesWithOrder}
              onCheckedChange={v => setCombinesWithOrder(!!v)}
            />
            <span className="text-sm">{t('admin.discounts.combinesOrder')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={combinesWithShipping}
              onCheckedChange={v => setCombinesWithShipping(!!v)}
            />
            <span className="text-sm">{t('admin.discounts.combinesShipping')}</span>
          </label>
        </div>
      </Card>

      {/* Active dates */}
      <Card className="p-4 space-y-3">
        <Label className="text-sm font-semibold">{t('admin.discounts.activeDates')}</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('admin.discounts.startsAt')}</Label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('admin.discounts.endsAt')}</Label>
            <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">{t('admin.discounts.endsAtHint')}</p>
          </div>
        </div>
      </Card>

      {/* Discount codes */}
      {method === 'code' && (
        <Card className="p-4 space-y-3">
          <Label className="text-sm font-semibold">{t('admin.discounts.codesSection')}</Label>
          <div className="flex gap-2">
            <Input
              value={newCode}
              onChange={e => setNewCode(e.target.value.toUpperCase())}
              placeholder={t('admin.discounts.codePlaceholder')}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCode();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddCode}
              disabled={!newCode.trim() || addingCode}
            >
              {addingCode ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
          {codes.length > 0 && (
            <div className="space-y-1">
              {codes.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5"
                >
                  <span className="font-mono text-sm">{c.code}</span>
                  <div className="flex items-center gap-2">
                    {c.usageCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {c.usageCount} {t('admin.discounts.used')}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveCode(c)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={saving || !title.trim()}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {initial ? t('admin.discounts.save') : t('admin.discounts.create')}
        </Button>
      </div>
    </form>
  );
}
