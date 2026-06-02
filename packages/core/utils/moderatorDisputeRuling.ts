/**
 * Moderator dispute ruling helpers — presets, validation, API error mapping.
 */

export type ModeratorRulingPreset = 'buyer' | 'seller' | 'split';

export interface ModeratorRulingDraft {
  buyerPercentage: number;
  vendorPercentage: number;
  resolution: string;
}

export type ModeratorRulingField = keyof ModeratorRulingDraft;

export type ModeratorRulingValidationErrors = Partial<
  Record<ModeratorRulingField, 'required' | 'range' | 'sum' | 'minLength' | 'vendorUnconfirmed'>
>;

/** Constraints when seller has not confirmed the order (vendor contract, no orderConfirmation). */
export interface ModeratorRulingConstraints {
  lockVendorShareAboveZero: boolean;
}

const MIN_RESOLUTION_LENGTH = 10;

/** Case payload slice from GET /v1/cases/{orderID}. */
export type CaseVendorConfirmationSlice = {
  vendorContract?: { orderConfirmation?: unknown } | null;
};

/** Seller has vendor contract on case but never sent orderConfirmation (desktop parity). */
export function isVendorOrderUnconfirmedFromCase(
  casePayload: CaseVendorConfirmationSlice | null | undefined
): boolean {
  if (!casePayload) return false;
  const vendor = casePayload.vendorContract;
  if (!vendor || typeof vendor !== 'object') return false;
  return vendor.orderConfirmation == null;
}

export function percentagesFromPreset(preset: ModeratorRulingPreset): {
  buyerPercentage: number;
  vendorPercentage: number;
} {
  switch (preset) {
    case 'buyer':
      return { buyerPercentage: 100, vendorPercentage: 0 };
    case 'seller':
      return { buyerPercentage: 0, vendorPercentage: 100 };
    case 'split':
      return { buyerPercentage: 50, vendorPercentage: 50 };
  }
}

export function createRulingDraftFromPreset(preset: ModeratorRulingPreset): ModeratorRulingDraft {
  const { buyerPercentage, vendorPercentage } = percentagesFromPreset(preset);
  return { buyerPercentage, vendorPercentage, resolution: '' };
}

export function createEmptyRulingDraft(): ModeratorRulingDraft {
  return { buyerPercentage: 50, vendorPercentage: 50, resolution: '' };
}

export function createRulingDraftForConstraints(
  constraints?: ModeratorRulingConstraints
): ModeratorRulingDraft {
  if (constraints?.lockVendorShareAboveZero) {
    return { buyerPercentage: 100, vendorPercentage: 0, resolution: '' };
  }
  return createEmptyRulingDraft();
}

export function createRulingDraftFromPresetWithConstraints(
  preset: ModeratorRulingPreset,
  constraints?: ModeratorRulingConstraints
): ModeratorRulingDraft {
  if (constraints?.lockVendorShareAboveZero && preset !== 'buyer') {
    return createRulingDraftForConstraints(constraints);
  }
  return createRulingDraftFromPreset(preset);
}

/** When buyer % changes, keep vendor % complementary (desktop behavior). */
export function rulingDraftWithBuyerPercentage(
  draft: ModeratorRulingDraft,
  buyerPercentage: number,
  constraints?: ModeratorRulingConstraints
): ModeratorRulingDraft {
  if (constraints?.lockVendorShareAboveZero) {
    return { ...draft, buyerPercentage: 100, vendorPercentage: 0 };
  }
  const clamped = clampPercentage(buyerPercentage);
  return {
    ...draft,
    buyerPercentage: clamped,
    vendorPercentage: 100 - clamped,
  };
}

/** When vendor % changes, keep buyer % complementary. */
export function rulingDraftWithVendorPercentage(
  draft: ModeratorRulingDraft,
  vendorPercentage: number,
  constraints?: ModeratorRulingConstraints
): ModeratorRulingDraft {
  if (constraints?.lockVendorShareAboveZero) {
    return { ...draft, buyerPercentage: 100, vendorPercentage: 0 };
  }
  const clamped = clampPercentage(vendorPercentage);
  return {
    ...draft,
    vendorPercentage: clamped,
    buyerPercentage: 100 - clamped,
  };
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function validateModeratorRulingDraft(
  draft: ModeratorRulingDraft,
  constraints?: ModeratorRulingConstraints
): ModeratorRulingValidationErrors {
  const errors: ModeratorRulingValidationErrors = {};
  const buyer = draft.buyerPercentage;
  const vendor = draft.vendorPercentage;

  if (constraints?.lockVendorShareAboveZero && Math.round(vendor) > 0) {
    errors.vendorPercentage = 'vendorUnconfirmed';
  }

  if (!Number.isFinite(buyer) || buyer < 0 || buyer > 100) {
    errors.buyerPercentage = 'range';
  }
  if (!Number.isFinite(vendor) || vendor < 0 || vendor > 100) {
    errors.vendorPercentage = 'range';
  }
  if (
    Number.isFinite(buyer) &&
    Number.isFinite(vendor) &&
    Math.round(buyer) + Math.round(vendor) !== 100
  ) {
    errors.buyerPercentage = errors.buyerPercentage ?? 'sum';
    errors.vendorPercentage = errors.vendorPercentage ?? 'sum';
  }

  const resolution = draft.resolution.trim();
  if (!resolution) {
    errors.resolution = 'required';
  } else if (resolution.length < MIN_RESOLUTION_LENGTH) {
    errors.resolution = 'minLength';
  }

  return errors;
}

export function isModeratorRulingDraftValid(
  draft: ModeratorRulingDraft,
  constraints?: ModeratorRulingConstraints
): boolean {
  return Object.keys(validateModeratorRulingDraft(draft, constraints)).length === 0;
}

/** Map raw API / network errors to i18n keys under order.moderatorRuling.errors */
export function mapModeratorDisputeApiError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('message not saved') ||
    lower.includes('message not sav') ||
    lower.includes('order open message')
  ) {
    return 'order.moderatorRuling.errors.orderDataUnavailable';
  }
  if (lower.includes('timeout')) {
    return 'order.moderatorRuling.errors.timeout';
  }
  if (lower.includes('unauthorized') || lower.includes('401')) {
    return 'order.moderatorRuling.errors.unauthorized';
  }
  if (lower.includes('vendor must provide') || lower.includes('copy of the contract')) {
    return 'order.moderatorRuling.errors.vendorContractRequired';
  }
  return 'order.moderatorRuling.errors.generic';
}
