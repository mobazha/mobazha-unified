'use client';

/**
 * TrustBadgesSection — PG-201
 *
 * Renders Web3 trust signals. Known badge types (escrow, crypto, etc.)
 * use i18n translations; custom badges use their own title/description.
 */

import type { TrustBadgesProps, TrustBadge } from '@mobazha/core';
import { useI18n } from '@mobazha/core';

const ICON_MAP: Record<string, string> = {
  escrow: '🛡️',
  crypto: '💰',
  selfHosted: '🏠',
  p2p: '🤝',
  privacy: '🔒',
  custom: '⭐',
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

function BadgeCard({ badge, style }: { badge: TrustBadge; style: TrustBadgesProps['style'] }) {
  const { t } = useI18n();
  const icon = badge.customIcon || ICON_MAP[badge.icon] || '⭐';
  const i18nKeys = TRUST_I18N[badge.icon];
  const title = i18nKeys ? t(i18nKeys.title) : badge.title;
  const description = i18nKeys ? t(i18nKeys.desc) : badge.description;

  if (style === 'minimal') {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-medium" style={{ fontFamily: 'var(--store-font)' }}>
            {title}
          </p>
          <p className="text-xs opacity-60">{description}</p>
        </div>
      </div>
    );
  }

  if (style === 'illustrated') {
    return (
      <div
        className="flex flex-col items-center gap-2 p-6 text-center"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--store-primary) 8%, transparent)',
          borderRadius: 'var(--store-radius)',
        }}
      >
        <span className="text-4xl">{icon}</span>
        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--store-font)' }}>
          {title}
        </p>
        <p className="text-xs opacity-60">{description}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-2 border p-4 text-center"
      style={{
        borderRadius: 'var(--store-radius)',
        borderColor: 'color-mix(in srgb, var(--store-primary) 15%, transparent)',
      }}
    >
      <span className="text-3xl">{icon}</span>
      <p className="text-sm font-semibold" style={{ fontFamily: 'var(--store-font)' }}>
        {title}
      </p>
      <p className="text-xs opacity-60">{description}</p>
    </div>
  );
}

export function TrustBadgesSection({ badges, layout, style }: TrustBadgesProps) {
  if (!badges || badges.length === 0) return null;

  const containerClass =
    layout === 'grid'
      ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'
      : 'flex flex-wrap items-start justify-center gap-6';

  return (
    <div className={containerClass}>
      {badges.map((badge, i) => (
        <BadgeCard key={`${badge.icon}-${i}`} badge={badge} style={style} />
      ))}
    </div>
  );
}
