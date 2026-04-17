'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n, useCurrency } from '@mobazha/core';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { ProductImageNative } from '@/components/ui/product-image';

export interface CartItemOption {
  name: string;
  value: string;
}

export interface CartItemRowProps {
  thumbnailUrl?: string;
  title: string;
  href: string;
  options?: CartItemOption[];
  vendorName?: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  onUpdateQuantity: (newQuantity: number) => void;
  onRemove: () => void;
  onNavigate?: () => void;
}

export function CartItemRow({
  thumbnailUrl,
  title,
  href,
  options,
  vendorName,
  unitPrice,
  currency,
  quantity,
  onUpdateQuantity,
  onRemove,
  onNavigate,
}: CartItemRowProps) {
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();
  const lineTotal = unitPrice * quantity;

  return (
    <div className="flex gap-3 p-3 rounded-lg border border-border bg-card">
      <Link href={href} onClick={onNavigate} className="flex-shrink-0">
        <div className="w-16 h-16 rounded-md overflow-hidden">
          <ProductImageNative src={thumbnailUrl} alt={title} iconSize="sm" />
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} onClick={onNavigate} className="min-w-0 flex-1">
            <p className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">
              {title}
            </p>
          </Link>
          <button
            className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={onRemove}
            data-testid="cart-item-remove"
            aria-label={t('cart.remove')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {options && options.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {options.map((opt, i) => (
              <span
                key={i}
                className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
              >
                {opt.name}: {opt.value}
              </span>
            ))}
          </div>
        )}

        {vendorName && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {vendorName}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              data-testid="cart-item-qty-decrease"
              className="w-9 h-9 flex items-center justify-center hover:bg-muted active:bg-muted/80 transition-colors disabled:opacity-40"
              disabled={quantity <= 1}
              onClick={() => onUpdateQuantity(quantity - 1)}
              aria-label={t('cart.decreaseQuantity')}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span
              className="w-8 text-center text-sm font-medium tabular-nums border-x border-border"
              data-testid="cart-item-qty"
            >
              {quantity}
            </span>
            <button
              className="w-9 h-9 flex items-center justify-center hover:bg-muted active:bg-muted/80 transition-colors"
              onClick={() => onUpdateQuantity(quantity + 1)}
              aria-label={t('cart.increaseQuantity')}
              data-testid="cart-item-qty-increase"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-sm font-semibold">
            {renderPairedPrice(lineTotal, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
