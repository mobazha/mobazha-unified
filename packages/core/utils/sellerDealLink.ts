// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { DealLinkPurchaseTemplate } from '../types/dealLink';
import type {
  SellerDealLink,
  SellerDealLinkOrder,
  SellerDealLinkOrdersPage,
} from '../types/sellerDealLink';
import { parseDealLinkTerms } from './dealLink';

function parsePurchaseTemplate(value: unknown): DealLinkPurchaseTemplate | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const listingHash = readString(raw.listingHash);
  if (!listingHash) return undefined;
  const options = Array.isArray(raw.options)
    ? (raw.options as DealLinkPurchaseTemplate['options'])
    : null;
  const optionalFeatures = Array.isArray(raw.optionalFeatures)
    ? (raw.optionalFeatures as string[])
    : null;
  return {
    listingHash,
    quantity: readRequiredString(raw.quantity, '1'),
    options,
    optionalFeatures,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readRequiredString(value: unknown, fallback = ''): string {
  return readString(value) ?? fallback;
}

function readRequiredNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function normalizeSellerDealLink(raw: Record<string, unknown>): SellerDealLink {
  return {
    id: readRequiredString(raw.id),
    publicToken: readRequiredString(raw.publicToken),
    publicPath: readRequiredString(raw.publicPath),
    sellerPeerID: readString(raw.sellerPeerID) ?? readString(raw.sellerPeerId) ?? '',
    status: readString(raw.status) ?? 'draft',
    currentRevision: readRequiredNumber(raw.currentRevision, 1),
    title: readRequiredString(raw.title),
    description: readString(raw.description),
    deliveryType: readString(raw.deliveryType) ?? 'unknown',
    priceAmount: readRequiredString(raw.priceAmount, '0'),
    priceCurrency: readRequiredString(raw.priceCurrency, 'USD'),
    terms: parseDealLinkTerms(raw.terms),
    purchaseTemplate: parsePurchaseTemplate(raw.purchaseTemplate),
    termsHash: readRequiredString(raw.termsHash),
    expiresAt: readString(raw.expiresAt),
    createdAt: readRequiredString(raw.createdAt),
    updatedAt: readRequiredString(raw.updatedAt),
  };
}

export function buildSellerDealLinkBrowseHref(link: Pick<SellerDealLink, 'publicToken'>): string {
  return `/deal/${encodeURIComponent(link.publicToken)}`;
}

function normalizeSellerDealLinkOrder(raw: Record<string, unknown>): SellerDealLinkOrder {
  const divisibility = readRequiredNumber(raw.currencyDivisibility, 0);
  return {
    orderID: readRequiredString(raw.orderID),
    status: readString(raw.status) ?? 'unknown',
    buyerPeerID: readString(raw.buyerPeerID) ?? '',
    pricingCoin: readString(raw.pricingCoin),
    amount: readString(raw.amount),
    currencyDivisibility: divisibility > 0 ? divisibility : undefined,
    createdAt: readRequiredString(raw.createdAt),
  };
}

export function normalizeSellerDealLinkOrdersPage(raw: unknown): SellerDealLinkOrdersPage {
  const root =
    raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw
      ? (raw as Record<string, unknown>).data
      : raw;
  const record =
    root && typeof root === 'object' && !Array.isArray(root)
      ? (root as Record<string, unknown>)
      : {};
  const items = Array.isArray(record.items)
    ? record.items
        .filter(
          (item): item is Record<string, unknown> =>
            item !== null && typeof item === 'object' && !Array.isArray(item)
        )
        .map(normalizeSellerDealLinkOrder)
    : [];
  return {
    items,
    total: readRequiredNumber(record.total, items.length),
    limit: readRequiredNumber(record.limit, items.length),
    offset: readRequiredNumber(record.offset, 0),
  };
}
