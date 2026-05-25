import type { Moderator as ApiModerator } from '@mobazha/core/services/api/moderators';
import { formatUserName } from '@mobazha/core/utils/identity';
import type { Moderator } from '@/components/Payment/types';

export const ADDED_TO_STORE_BUTTON_CLASS =
  'border border-primary/20 bg-primary/10 text-primary shadow-none disabled:opacity-100';

export function mapApiModeratorToModerator(
  mod: ApiModerator,
  verifiedPeerIds: Set<string> = new Set()
): Moderator {
  return {
    id: mod.id,
    peerID: mod.peerID,
    name: mod.name,
    handle: mod.handle,
    avatar: mod.avatar,
    avatarHashes: mod.avatarHashes,
    location: mod.location,
    shortDescription: mod.shortDescription,
    description: mod.description || mod.shortDescription,
    languages: mod.languages,
    verified: mod.verified,
    verifiedMod: verifiedPeerIds.has(mod.peerID),
    fee: {
      percentage: mod.fee.percentage,
      fixedFee: mod.fee.fixedFee
        ? {
            amount: String(mod.fee.fixedFee.amount),
            currency: mod.fee.fixedFee.currency,
          }
        : undefined,
      feeType: mod.fee.feeType,
    },
    stats: mod.stats,
    termsAndConditions: mod.termsAndConditions,
    acceptedCurrencies: mod.acceptedCurrencies,
    contactInfo: mod.contactInfo,
  };
}

export function isModeratorVerified(moderator: Moderator): boolean {
  return Boolean(moderator.verified || moderator.verifiedMod);
}

export function getModeratorDisplayName(moderator: Moderator, fallback = 'Moderator'): string {
  return formatUserName(
    { name: moderator.name, handle: moderator.handle, peerID: moderator.peerID },
    { fallback }
  );
}

export function formatModeratorFee(moderator: Moderator): string | null {
  const { fee } = moderator;
  if (!fee) return null;
  if (fee.feeType === 'percentage' && fee.percentage !== undefined) {
    return `${fee.percentage}%`;
  }
  if (fee.feeType === 'percentage_plus_fixed' || fee.feeType === 'fixed_plus_percentage') {
    const parts: string[] = [];
    if (fee.percentage !== undefined) parts.push(`${fee.percentage}%`);
    if (fee.fixedFee) parts.push(`${fee.fixedFee.amount} ${fee.fixedFee.currency}`);
    return parts.length > 0 ? parts.join(' + ') : null;
  }
  if (fee.fixedFee) {
    return `${fee.fixedFee.amount} ${fee.fixedFee.currency}`;
  }
  return null;
}

export function getModeratorTrustMetrics(moderator: Moderator): {
  fee: string;
  rating: string;
  disputes: string;
  successRate: string;
  avgResolution: string;
} {
  const stats = moderator.stats;

  return {
    fee: formatModeratorFee(moderator) ?? '—',
    rating: stats && stats.ratingCount > 0 ? stats.rating.toFixed(1) : '—',
    disputes: stats ? String(stats.disputesHandled) : '—',
    successRate: stats && stats.successRate > 0 ? `${stats.successRate}%` : '—',
    avgResolution:
      stats && stats.averageResolutionTime > 0 ? `${stats.averageResolutionTime}h` : '—',
  };
}
