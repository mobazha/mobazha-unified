'use client';

import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { Edit3, Check, X, ImagePlus } from 'lucide-react';
import { useI18n, getVariantLabel, getGatewayUrl } from '@mobazha/core';
import type { Image } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ─── 类型定义 ─────────────────────────────────────

export interface SkuItem {
  productID: string;
  selections: { option: string; variant: string }[];
  price: string;
  compareAtPrice: string;
  quantity: number;
  images: Image[];
  barcode: string;
  weight: number;
}

export interface VariantInventoryTableProps {
  skus: SkuItem[];
  onChange: (skus: SkuItem[]) => void;
  pricingCurrency?: string;
  basePrice?: string;
  /** Product images available for variant image selection */
  productImages?: Image[];
  className?: string;
}

// ─── 批量编辑类型 ─────────────────────────────────

type BulkField = 'price' | 'compareAtPrice' | 'quantity' | 'weight';

interface BulkEditState {
  field: BulkField;
  value: string;
}

// ─── 组件 ─────────────────────────────────────────

export function VariantInventoryTable({
  skus,
  onChange,
  pricingCurrency = 'USD',
  basePrice,
  productImages = [],
  className,
}: VariantInventoryTableProps) {
  const { t } = useI18n();
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [bulkEdit, setBulkEdit] = useState<BulkEditState | null>(null);
  const [imagePickerIndex, setImagePickerIndex] = useState<number | null>(null);
  const imagePickerRef = useRef<HTMLDivElement>(null);

  // Close image picker on outside click
  useEffect(() => {
    if (imagePickerIndex === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (imagePickerRef.current && !imagePickerRef.current.contains(e.target as globalThis.Node)) {
        setImagePickerIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [imagePickerIndex]);

  // ─── 单个 SKU 更新 ─────────────────────

  const updateSku = useCallback(
    (index: number, field: keyof SkuItem, value: SkuItem[keyof SkuItem]) => {
      const updated = [...skus];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    },
    [skus, onChange]
  );

  // ─── 全选/取消全选 ─────────────────────

  const allSelected = useMemo(
    () => skus.length > 0 && selectedIndices.size === skus.length,
    [skus.length, selectedIndices.size]
  );

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(skus.map((_, i) => i)));
    }
  }, [allSelected, skus]);

  const toggleOne = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // ─── 批量编辑 ──────────────────────────

  const applyBulkEdit = useCallback(() => {
    if (!bulkEdit || selectedIndices.size === 0) return;

    const updated = [...skus];
    for (const index of selectedIndices) {
      if (bulkEdit.field === 'quantity') {
        const val = bulkEdit.value === '' ? -1 : parseInt(bulkEdit.value, 10);
        if (isNaN(val)) return;
        updated[index] = { ...updated[index], quantity: val };
      } else if (bulkEdit.field === 'weight') {
        const val = bulkEdit.value === '' ? 0 : parseInt(bulkEdit.value, 10);
        if (isNaN(val)) return;
        updated[index] = { ...updated[index], weight: val };
      } else {
        updated[index] = { ...updated[index], [bulkEdit.field]: bulkEdit.value };
      }
    }
    onChange(updated);
    setBulkEdit(null);
  }, [bulkEdit, selectedIndices, skus, onChange]);

  const cancelBulkEdit = useCallback(() => {
    setBulkEdit(null);
  }, []);

  if (skus.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* 批量操作栏 - Shopify 风格 */}
      {selectedIndices.size > 0 && (
        <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">
            {t('listing.variant.selectedCount', { count: selectedIndices.size })}
          </span>

          {bulkEdit ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t(`listing.variant.${bulkEdit.field}`)}:
              </span>
              <Input
                type="number"
                step={bulkEdit.field === 'quantity' || bulkEdit.field === 'weight' ? '1' : '0.01'}
                value={bulkEdit.value}
                onChange={e => setBulkEdit({ ...bulkEdit, value: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') applyBulkEdit();
                  if (e.key === 'Escape') cancelBulkEdit();
                }}
                placeholder={bulkEdit.field === 'quantity' ? t('listing.variant.unlimited') : '0'}
                className="h-8 w-28 text-sm"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={applyBulkEdit}
                className="h-8"
                aria-label={t('listing.variant.bulkApply')}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={cancelBulkEdit}
                className="h-8"
                aria-label={t('listing.variant.bulkCancel')}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              {(['price', 'compareAtPrice', 'quantity', 'weight'] as BulkField[]).map(field => (
                <Button
                  key={field}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkEdit({ field, value: '' })}
                  className="h-7 text-xs"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {t(`listing.variant.bulk${field.charAt(0).toUpperCase()}${field.slice(1)}`)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 库存表格 */}
      <div className="rounded-lg border overflow-x-auto">
        <Table data-testid="variant-inventory-table">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="font-medium w-14">{t('listing.variant.image')}</TableHead>
              <TableHead className="font-medium min-w-[140px]">
                {t('listing.variant.variant')}
              </TableHead>
              <TableHead className="font-medium w-28">
                {t('listing.variant.price')}
                <span className="text-xs text-muted-foreground ml-1">({pricingCurrency})</span>
              </TableHead>
              <TableHead className="font-medium w-28">
                {t('listing.variant.compareAtPrice')}
              </TableHead>
              <TableHead className="font-medium w-24">{t('listing.variant.quantity')}</TableHead>
              <TableHead className="font-medium w-28">{t('listing.variant.barcode')}</TableHead>
              <TableHead className="font-medium w-24">
                {t('listing.variant.weight')}
                <span className="text-xs text-muted-foreground ml-1">(g)</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skus.map((sku, index) => {
              const isSelected = selectedIndices.has(index);
              return (
                <TableRow
                  key={getVariantLabel(sku.selections) || index}
                  className={`transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                >
                  {/* 选择框 */}
                  <TableCell>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(index)} />
                  </TableCell>

                  {/* 变体图片 */}
                  <TableCell>
                    <div
                      className="relative"
                      ref={imagePickerIndex === index ? imagePickerRef : undefined}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setImagePickerIndex(imagePickerIndex === index ? null : index)
                        }
                        className="w-10 h-10 rounded border border-border overflow-hidden flex items-center justify-center bg-muted/30 hover:border-primary/50 transition-colors"
                        aria-label={t('listing.variant.selectImage')}
                      >
                        {sku.images?.[0] ? (
                          <img
                            src={`${getGatewayUrl()}/images/${sku.images[0].tiny || sku.images[0].small || ''}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImagePlus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      {/* Image picker dropdown */}
                      {imagePickerIndex === index && productImages.length > 0 && (
                        <div className="absolute z-20 top-12 left-0 bg-background border border-border rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 min-w-[180px]">
                          {productImages.map((img, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => {
                                updateSku(index, 'images', [img]);
                                setImagePickerIndex(null);
                              }}
                              className={`w-10 h-10 rounded border overflow-hidden hover:border-primary transition-colors ${
                                sku.images?.[0]?.small === img.small
                                  ? 'border-primary ring-1 ring-primary'
                                  : 'border-border'
                              }`}
                            >
                              <img
                                src={`${getGatewayUrl()}/images/${img.tiny || img.small || ''}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                          {sku.images?.[0] && (
                            <button
                              type="button"
                              onClick={() => {
                                updateSku(index, 'images', []);
                                setImagePickerIndex(null);
                              }}
                              className="w-10 h-10 rounded border border-border flex items-center justify-center hover:border-destructive hover:text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* 变体名称 */}
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">{getVariantLabel(sku.selections)}</div>
                  </TableCell>

                  {/* 价格 */}
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sku.price}
                      onChange={e => updateSku(index, 'price', e.target.value)}
                      placeholder={basePrice || '0.00'}
                      className="h-8 text-sm"
                    />
                  </TableCell>

                  {/* 划线价 */}
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sku.compareAtPrice}
                      onChange={e => updateSku(index, 'compareAtPrice', e.target.value)}
                      placeholder={t('listing.variants.dashPlaceholder')}
                      className="h-8 text-sm"
                    />
                  </TableCell>

                  {/* 库存 */}
                  <TableCell>
                    <Input
                      type="number"
                      min="-1"
                      value={sku.quantity === -1 ? '' : sku.quantity}
                      onChange={e => {
                        const val = e.target.value;
                        const parsed = val === '' ? -1 : parseInt(val, 10);
                        if (!isNaN(parsed)) updateSku(index, 'quantity', parsed);
                      }}
                      placeholder={t('listing.variants.unlimitedPlaceholder')}
                      className="h-8 text-sm"
                    />
                  </TableCell>

                  {/* 条码 */}
                  <TableCell>
                    <Input
                      value={sku.barcode}
                      onChange={e => updateSku(index, 'barcode', e.target.value)}
                      placeholder={t('listing.variants.barcodePlaceholder')}
                      className="h-8 text-sm"
                    />
                  </TableCell>

                  {/* 重量 */}
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={sku.weight != null ? sku.weight : ''}
                      onChange={e => {
                        const val = e.target.value;
                        const parsed = val === '' ? 0 : parseInt(val, 10);
                        if (!isNaN(parsed)) updateSku(index, 'weight', parsed);
                      }}
                      placeholder={t('listing.variants.weightPlaceholder')}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">
          {t('listing.variant.skuCount', { count: skus.length })}
        </p>
        {basePrice && (
          <p className="text-xs text-muted-foreground">
            {t('listing.variant.basePriceHint', { price: basePrice, currency: pricingCurrency })}
          </p>
        )}
      </div>
    </div>
  );
}
