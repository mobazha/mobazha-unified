'use client';

/**
 * TrustBadgesSection — PG-201 / PG-203
 *
 * Renders Web3 trust signals with a consistent SVG icon system (emoji made
 * cross-platform rendering unpredictable). Badges that still carry the stock
 * WEB3_TRUST_KIT copy localize via i18n; seller-edited copy wins.
 */

import type { TrustBadgesProps, TrustBadge } from '@mobazha/core';
import { useI18n, getImageUrl, useStoreCapabilities, WEB3_TRUST_KIT } from '@mobazha/core';
import {
  BadgeCheck,
  ShieldCheck,
  Coins,
  Server,
  Handshake,
  Lock,
  Star,
  type LucideIcon,
} from 'lucide-react';

const ICON_COMPONENTS: Record<string, LucideIcon> = {
  escrow: ShieldCheck,
  crypto: Coins,
  selfHosted: Server,
  p2p: Handshake,
  privacy: Lock,
  custom: Star,
};

const TRUST_I18N: Record<string, { title: string; desc: string }> = {
  escrow: { title: 'admin.storeBranding.trustEscrow', desc: 'admin.storeBranding.trustEscrowDesc' },
  crypto: { title: 'admin.storeBranding.trustCrypto', desc: 'admin.storeBranding.trustCryptoDesc' },
  selfHosted: {
    title: 'admin.storeBranding.trustSelfHosted',
    desc: 'admin.storeBranding.trustSelfHostedDesc',
  },
  p2p: { title: 'admin.storeBranding.trustP2p', desc: 'admin.storeBranding.trustP2pDesc' },
  privacy: {
    title: 'admin.storeBranding.trustPrivacy',
    desc: 'admin.storeBranding.trustPrivacyDesc',
  },
};

const STOCK_COPY = new Map(WEB3_TRUST_KIT.map(b => [b.icon, b]));

/** Localize stock copy; keep anything the seller customized. */
function useBadgeCopy(badge: TrustBadge): { title: string; description: string } {
  const { t } = useI18n();
  const i18nKeys = TRUST_I18N[badge.icon];
  const stock = STOCK_COPY.get(badge.icon);
  const titleIsStock = !badge.title || badge.title === stock?.title;
  const descIsStock = !badge.description || badge.description === stock?.description;
  return {
    title: i18nKeys && titleIsStock ? t(i18nKeys.title) : badge.title,
    description: i18nKeys && descIsStock ? t(i18nKeys.desc) : badge.description,
  };
}

function BadgeIcon({
  badge,
  size,
  storeHint,
}: {
  badge: TrustBadge;
  size: 'sm' | 'lg';
  storeHint?: string;
}) {
  const px = size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const iconPx = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  const customUrl = badge.icon === 'custom' ? getImageUrl(badge.customIcon, storeHint) : undefined;
  const Icon = ICON_COMPONENTS[badge.icon] || Star;

  return (
    <span
      className={`${px} shrink-0 rounded-full flex items-center justify-center overflow-hidden`}
      data-testid="trust-badge-icon"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--store-primary) 10%, transparent)',
        color: 'var(--store-on-primary)',
      }}
    >
      {customUrl ? (
        <img src={customUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <Icon className={iconPx} strokeWidth={1.75} aria-hidden="true" />
      )}
    </span>
  );
}

function BadgeCard({
  badge,
  style,
  storeHint,
  verified,
}: {
  badge: TrustBadge;
  style: TrustBadgesProps['style'];
  storeHint?: string;
  verified?: boolean;
}) {
  const { title, description } = useBadgeCopy(badge);
  const { t } = useI18n();

  const titleEl = (
    <span className="inline-flex items-center gap-1">
      {title}
      {verified && (
        <BadgeCheck
          className="w-3.5 h-3.5"
          style={{ color: 'var(--store-primary)' }}
          aria-label={t('admin.storeBranding.trustVerified')}
        >
          <title>{t('admin.storeBranding.trustVerified')}</title>
        </BadgeCheck>
      )}
    </span>
  );

  if (style === 'minimal') {
    return (
      <div className="flex items-center gap-3 py-2">
        <BadgeIcon badge={badge} size="sm" storeHint={storeHint} />
        <div>
          <p className="text-sm font-medium" style={{ fontFamily: 'var(--store-font)' }}>
            {titleEl}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    );
  }

  if (style === 'illustrated') {
    return (
      <div
        className="flex flex-col items-center gap-3 p-6 text-center"
        style={{
          backgroundColor: 'var(--store-surface)',
          borderRadius: 'var(--store-radius)',
        }}
      >
        <BadgeIcon badge={badge} size="lg" storeHint={storeHint} />
        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--store-font)' }}>
          {titleEl}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-3 border p-4 text-center"
      style={{
        borderRadius: 'var(--store-radius)',
        borderColor: 'color-mix(in srgb, var(--store-primary) 15%, transparent)',
      }}
    >
      <BadgeIcon badge={badge} size="lg" storeHint={storeHint} />
      <p className="text-sm font-semibold" style={{ fontFamily: 'var(--store-font)' }}>
        {titleEl}
      </p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function TrustBadgesSection({
  badges,
  layout,
  style,
  storeHint,
}: TrustBadgesProps & { storeHint?: string }) {
  // Capability gating (PG-203): "Buyer Protection" and "Crypto Native" are
  // claims a buyer can act on, so they only render when the store's real,
  // unfakeable state backs them — a published moderator list for escrow, an
  // advertised accepted currency for crypto. While capabilities are still
  // loading (or in editor preview, where storeHint is absent) badges render
  // ungated so nothing flickers in and out.
  const capabilities = useStoreCapabilities(storeHint || null);

  if (!badges || badges.length === 0) return null;

  const visibleBadges = badges.filter(badge => {
    if (badge.icon === 'escrow') return capabilities.escrow !== false;
    if (badge.icon === 'crypto') return capabilities.crypto !== false;
    return true;
  });
  if (visibleBadges.length === 0) return null;

  const verified = (badge: TrustBadge): boolean =>
    (badge.icon === 'escrow' && capabilities.escrow === true) ||
    (badge.icon === 'crypto' && capabilities.crypto === true);

  const containerClass =
    layout === 'grid'
      ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'
      : 'flex flex-wrap items-start justify-center gap-6';

  return (
    <div className={containerClass}>
      {visibleBadges.map((badge, i) => (
        <BadgeCard
          key={`${badge.icon}-${i}`}
          badge={badge}
          style={style}
          storeHint={storeHint}
          verified={verified(badge)}
        />
      ))}
    </div>
  );
}
