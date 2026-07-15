'use client';

/**
 * TrustBadgesSection — PG-201 / PG-203
 *
 * Renders Web3 trust signals with a consistent SVG icon system (emoji made
 * cross-platform rendering unpredictable). Badges that still carry the stock
 * WEB3_TRUST_KIT copy localize via i18n; seller-edited copy wins.
 */

import type { TrustBadgesProps, TrustBadge } from '@mobazha/core';
import { useI18n, getImageUrl, WEB3_TRUST_KIT } from '@mobazha/core';
import { ShieldCheck, Coins, Server, Handshake, Lock, Star, type LucideIcon } from 'lucide-react';

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
      style={{
        backgroundColor: 'color-mix(in srgb, var(--store-primary) 10%, transparent)',
        color: 'var(--store-primary)',
      }}
    >
      {customUrl ? (
        <img src={customUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <Icon className={iconPx} strokeWidth={1.75} />
      )}
    </span>
  );
}

function BadgeCard({
  badge,
  style,
  storeHint,
}: {
  badge: TrustBadge;
  style: TrustBadgesProps['style'];
  storeHint?: string;
}) {
  const { title, description } = useBadgeCopy(badge);

  if (style === 'minimal') {
    return (
      <div className="flex items-center gap-3 py-2">
        <BadgeIcon badge={badge} size="sm" storeHint={storeHint} />
        <div>
          <p className="text-sm font-medium" style={{ fontFamily: 'var(--store-font)' }}>
            {title}
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
          backgroundColor: 'color-mix(in srgb, var(--store-primary) 8%, transparent)',
          borderRadius: 'var(--store-radius)',
        }}
      >
        <BadgeIcon badge={badge} size="lg" storeHint={storeHint} />
        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--store-font)' }}>
          {title}
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
        {title}
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
  if (!badges || badges.length === 0) return null;

  const containerClass =
    layout === 'grid'
      ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'
      : 'flex flex-wrap items-start justify-center gap-6';

  return (
    <div className={containerClass}>
      {badges.map((badge, i) => (
        <BadgeCard key={`${badge.icon}-${i}`} badge={badge} style={style} storeHint={storeHint} />
      ))}
    </div>
  );
}
