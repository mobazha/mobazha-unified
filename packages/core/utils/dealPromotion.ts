import { ApiError } from '../services/api/client';
import type {
  DealAttributionClaim,
  DealPromotionLink,
  DealPromotionPageErrorKind,
  DealPromotionProgram,
  PublicDealPromotionLink,
  StoredDealAttributionClaim,
} from '../types/dealPromotion';

export const DEAL_ATTRIBUTION_CLAIM_SESSION_KEY = 'mobazha:deal-attribution-claim';

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readRequiredString(value: unknown, fallback = ''): string {
  return readString(value) ?? fallback;
}

function readOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readRequiredNumber(value: unknown, fallback = 0): number {
  return readOptionalNumber(value) ?? fallback;
}

export function extractDealTokenFromPublicPath(publicPath: string): string | null {
  const trimmed = publicPath.trim();
  const marker = '/public/deal-links/';
  const index = trimmed.indexOf(marker);
  if (index < 0) return null;
  const token = trimmed
    .slice(index + marker.length)
    .split('/')[0]
    ?.trim();
  return token || null;
}

export function buildDealPromotionEntryHref(publicToken: string): string {
  return `/promo/${encodeURIComponent(publicToken)}`;
}

export function buildDealLinkBrowseHref(dealToken: string): string {
  return `/deal/${encodeURIComponent(dealToken)}`;
}

export function buildPromoterProgramHref(programId: string): string {
  return `/promote/${encodeURIComponent(programId)}`;
}

export function formatCommissionRateFromBPS(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return '0';
  const percent = bps / 100;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/\.?0+$/, '');
}

export function parseCommissionPercentToBPS(percent: string): number | null {
  const trimmed = percent.trim();
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) return null;
  return parsed * 100;
}

export function isValidOptionalCommissionAmount(amount: string): boolean {
  const trimmed = amount.trim();
  if (!trimmed) return true;
  if (!/^[0-9]+(?:\.[0-9]{1,18})?$/.test(trimmed)) return false;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0;
}

export function formatAttributionWindowDays(seconds: number): number | undefined {
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.max(1, Math.round(seconds / 86400));
}

export function parseAttributionWindowDaysToSeconds(days: string): number | null {
  const trimmed = days.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) return null;
  return parsed * 86400;
}

export function normalizeDealPromotionProgram(raw: Record<string, unknown>): DealPromotionProgram {
  return {
    id: readRequiredString(raw.id),
    sellerPeerID: readString(raw.sellerPeerID) ?? readString(raw.sellerPeerId) ?? '',
    dealLinkID: readString(raw.dealLinkID) ?? readString(raw.dealLinkId) ?? '',
    name: readRequiredString(raw.name),
    status: readString(raw.status) ?? 'draft',
    schemaVersion: readRequiredNumber(raw.schemaVersion, 1),
    policyVersion: readRequiredString(raw.policyVersion, 'single-level-direct-v1'),
    commissionRateBPS: readRequiredNumber(raw.commissionRateBPS),
    calculationBase: readRequiredString(raw.calculationBase, 'gross_order_amount'),
    maxCommissionAmount: readString(raw.maxCommissionAmount),
    currency: readRequiredString(raw.currency, 'USD'),
    attributionWindowSeconds: readRequiredNumber(raw.attributionWindowSeconds),
    declaredFundingSource: readRequiredString(raw.declaredFundingSource, 'seller_manual_budget'),
    settlementMode: readRequiredString(raw.settlementMode, 'manual_review_only'),
    createdAt: readRequiredString(raw.createdAt),
    updatedAt: readRequiredString(raw.updatedAt),
  };
}

export function normalizeDealPromotionLink(raw: Record<string, unknown>): DealPromotionLink {
  return {
    id: readRequiredString(raw.id),
    programID: readString(raw.programID) ?? readString(raw.programId) ?? '',
    status: readString(raw.status) ?? 'active',
    publicToken: readRequiredString(raw.publicToken),
    publicPath: readRequiredString(raw.publicPath),
    createdAt: readRequiredString(raw.createdAt),
  };
}

export function normalizePublicDealPromotionLink(
  raw: Record<string, unknown>
): PublicDealPromotionLink {
  return {
    programID: readString(raw.programID) ?? readString(raw.programId) ?? '',
    programName: readRequiredString(raw.programName),
    dealLinkID: readString(raw.dealLinkID) ?? readString(raw.dealLinkId) ?? '',
    dealPublicPath: readRequiredString(raw.dealPublicPath),
    dealRevision: readRequiredNumber(raw.dealRevision),
    termsHash: readRequiredString(raw.termsHash),
    currency: readRequiredString(raw.currency, 'USD'),
    commissionRateBPS: readRequiredNumber(raw.commissionRateBPS),
    attributionWindowSeconds: readRequiredNumber(raw.attributionWindowSeconds),
    settlementMode: readRequiredString(raw.settlementMode, 'manual_review_only'),
  };
}

export function normalizeDealAttributionClaim(raw: Record<string, unknown>): DealAttributionClaim {
  return {
    claimToken: readRequiredString(raw.claimToken),
    expiresAt: readRequiredString(raw.expiresAt),
    dealLinkID: readString(raw.dealLinkID) ?? readString(raw.dealLinkId) ?? '',
    dealRevision: readRequiredNumber(raw.dealRevision),
    termsHash: readRequiredString(raw.termsHash),
    programPolicyVersion: readRequiredString(raw.programPolicyVersion),
    commissionRateBPS: readRequiredNumber(raw.commissionRateBPS),
    calculationBase: readRequiredString(raw.calculationBase, 'gross_order_amount'),
    maxCommissionAmount: readString(raw.maxCommissionAmount),
    currency: readRequiredString(raw.currency, 'USD'),
    settlementMode: readRequiredString(raw.settlementMode, 'manual_review_only'),
  };
}

export function isDealAttributionClaimExpired(
  claim: Pick<DealAttributionClaim, 'expiresAt'> | null | undefined,
  now = Date.now()
): boolean {
  if (!claim?.expiresAt) return true;
  const parsed = Date.parse(claim.expiresAt);
  return !Number.isFinite(parsed) || parsed <= now;
}

export function isStoredDealAttributionClaimValid(
  claim: StoredDealAttributionClaim | null | undefined,
  dealToken: string | undefined,
  now = Date.now()
): claim is StoredDealAttributionClaim {
  if (!claim || !dealToken) return false;
  if (claim.dealToken !== dealToken) return false;
  if (!claim.claimToken?.trim()) return false;
  return !isDealAttributionClaimExpired(claim, now);
}

export function buildStoredDealAttributionClaim(
  claim: DealAttributionClaim,
  dealToken: string,
  extras?: Pick<StoredDealAttributionClaim, 'attributionWindowSeconds'>
): StoredDealAttributionClaim {
  return { ...claim, dealToken, ...extras };
}

export function readStoredDealAttributionClaim(): StoredDealAttributionClaim | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DEAL_ATTRIBUTION_CLAIM_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const claim = normalizeDealAttributionClaim(parsed);
    const dealToken = readString(parsed.dealToken);
    if (!dealToken || !claim.claimToken) {
      clearStoredDealAttributionClaim();
      return null;
    }
    return buildStoredDealAttributionClaim(claim, dealToken, {
      attributionWindowSeconds: readOptionalNumber(parsed.attributionWindowSeconds),
    });
  } catch {
    clearStoredDealAttributionClaim();
    return null;
  }
}

export function writeStoredDealAttributionClaim(claim: StoredDealAttributionClaim): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(DEAL_ATTRIBUTION_CLAIM_SESSION_KEY, JSON.stringify(claim));
}

export function clearStoredDealAttributionClaim(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(DEAL_ATTRIBUTION_CLAIM_SESSION_KEY);
}

/** Clear only when hosting explicitly rejects the attribution claim itself. */
export function shouldClearDealAttributionClaimOnError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (![400, 409, 410].includes(error.status ?? 0)) return false;
  const haystack = `${error.code ?? ''} ${error.message} ${error.detail ?? ''}`.toLowerCase();
  return haystack.includes('attribution') || haystack.includes('claim');
}

export function classifyDealPromotionError(error: unknown): DealPromotionPageErrorKind {
  if (error instanceof ApiError) {
    const haystack = `${error.code ?? ''} ${error.message} ${error.detail ?? ''}`.toLowerCase();
    if (error.status === 404 || haystack.includes('not found')) return 'not_found';
    if (error.status === 410 || haystack.includes('expired')) return 'expired';
    if (
      haystack.includes('inactive') ||
      haystack.includes('paused') ||
      haystack.includes('not active') ||
      haystack.includes('conflict')
    ) {
      return 'inactive';
    }
    if (error.status === 0 || haystack.includes('network') || haystack.includes('fetch')) {
      return 'network';
    }
  }
  if (error instanceof TypeError) return 'network';
  return 'unknown';
}
