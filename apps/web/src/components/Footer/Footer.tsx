'use client';

import React from 'react';
import Link from 'next/link';
import { Container, Grid, HStack, VStack } from '@/components/layouts';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n, useUserStore, getImageUrl, isStandalone, stripHtmlTags } from '@mobazha/core';
import { TokenIcon } from '@/components/Payment/TokenIcon';

const socialLinks = [
  {
    label: 'Twitter',
    href: 'https://twitter.com/mobazha',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: 'https://github.com/mobazha',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    label: 'Discord',
    href: 'https://discord.gg/mobazha',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
];

export const Footer: React.FC = () => {
  const { t } = useI18n();
  const { profile, isAuthenticated } = useUserStore();
  const standaloneMode = isStandalone();

  const startSellingHref = standaloneMode
    ? '/listing/new'
    : isAuthenticated
      ? '/admin'
      : '/login?redirect=%2Fadmin';

  const footerLinks = {
    marketplace: [
      { label: t('footer.browseProducts'), href: '/marketplace' },
      { label: t('footer.categories'), href: '/search' },
      { label: t('footer.findModerators'), href: '/moderators' },
      { label: t('footer.startSelling'), href: startSellingHref },
    ],
    resources: [
      {
        label: t('footer.gettingStarted'),
        href: 'https://github.com/mobazha/mobazha/wiki',
        external: true,
      },
      {
        label: t('footer.documentation'),
        href: 'https://github.com/mobazha/mobazha/wiki',
        external: true,
      },
      {
        label: t('footer.api'),
        href: 'https://github.com/mobazha/mobazha/wiki/API',
        external: true,
      },
      {
        label: t('footer.faq'),
        href: 'https://github.com/mobazha/mobazha/wiki/FAQ',
        external: true,
      },
    ],
    community: [
      { label: 'Twitter', href: 'https://twitter.com/mobazha', external: true },
      { label: 'Discord', href: 'https://discord.gg/mobazha', external: true },
      { label: 'GitHub', href: 'https://github.com/mobazha', external: true },
    ],
    legal: [
      { label: t('policies.privacyPolicy'), href: '/policies/privacy' },
      { label: t('policies.termsOfService'), href: '/policies/terms' },
    ],
    shop: [
      { label: t('footer.allProducts'), href: '/#products' },
      { label: t('footer.collections'), href: '/collections' },
    ],
    policies: [
      { label: t('policies.privacyPolicy'), href: '/policies/privacy' },
      { label: t('policies.termsOfService'), href: '/policies/terms' },
      { label: t('policies.shipping'), href: '/policies/shipping' },
      { label: t('policies.returns'), href: '/policies/returns' },
      { label: t('policies.buyerProtectionPolicy'), href: '/policies/buyer-protection' },
      { label: t('policies.refundTitle'), href: '/policies/refund' },
    ],
  };

  return (
    <footer className="hidden md:block bg-muted border-t border-border">
      {/* Desktop Footer — MobileNav replaces footer on mobile */}
      <div className="pt-16 pb-8">
        <Container size="xl">
          <Grid
            cols={standaloneMode ? 4 : 5}
            colsMobile={2}
            colsTablet={standaloneMode ? 4 : 4}
            gap="lg"
            className="mb-12"
          >
            {/* Brand */}
            <div className="col-span-2">
              {standaloneMode && profile ? (
                <>
                  <Link href="/" className="flex items-center gap-2 mb-3">
                    <Avatar
                      src={getImageUrl(profile.avatarHashes?.small)}
                      name={profile.name || ''}
                      size="sm"
                    />
                    <span className="font-bold text-xl text-foreground">{profile.name}</span>
                  </Link>
                  {profile.shortDescription && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {stripHtmlTags(profile.shortDescription)}
                    </p>
                  )}
                  <HStack gap="sm">
                    {socialLinks.map(social => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-primary"
                        aria-label={social.label}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </HStack>
                </>
              ) : (
                <>
                  <Link href="/" className="flex items-center gap-2 mb-3">
                    <MobazhaLogo size={36} className="text-primary" />
                    <span className="font-bold text-xl text-foreground">Mobazha</span>
                  </Link>
                  <p className="text-sm text-muted-foreground mb-1 italic">{t('footer.slogan')}</p>
                  <p className="text-sm text-muted-foreground mb-4">{t('footer.tagline')}</p>
                  <HStack gap="sm">
                    {socialLinks.map(social => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-primary"
                        aria-label={social.label}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </HStack>
                </>
              )}
            </div>

            {standaloneMode ? (
              <>
                {/* Shop column */}
                <VStack gap="sm" align="start">
                  <h4 className="font-semibold text-foreground mb-2">{t('footer.shop')}</h4>
                  {footerLinks.shop.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </VStack>

                {/* Policies column */}
                <VStack gap="sm" align="start">
                  <h4 className="font-semibold text-foreground mb-2">{t('footer.storePolicy')}</h4>
                  {footerLinks.policies.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </VStack>
              </>
            ) : (
              <>
                <VStack gap="sm" align="start">
                  <h4 className="font-semibold text-foreground mb-2">{t('footer.marketplace')}</h4>
                  {footerLinks.marketplace.map(link => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </VStack>

                <VStack gap="sm" align="start">
                  <h4 className="font-semibold text-foreground mb-2">{t('footer.resources')}</h4>
                  {footerLinks.resources.map(link => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </VStack>

                <VStack gap="sm" align="start">
                  <h4 className="font-semibold text-foreground mb-2">{t('footer.community')}</h4>
                  {footerLinks.community.map(link => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </VStack>
              </>
            )}
          </Grid>

          {/* Payment Methods */}
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xs text-muted-foreground/60 uppercase tracking-wide">
              {t('footer.paymentMethods')}
            </span>
            <div className="flex items-center gap-2 opacity-60">
              {['BTC', 'ETH', 'SOL', 'BNB', 'MATIC', 'LTC', 'USDT', 'USDC'].map(token => (
                <TokenIcon key={token} token={token} size={20} />
              ))}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {standaloneMode && profile ? (
                <>
                  © {new Date().getFullYear()} {profile.name}.{' '}
                  <a
                    href="https://mobazha.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    Powered by Mobazha
                  </a>
                </>
              ) : (
                <>
                  © {new Date().getFullYear()} Mobazha. {t('footer.allRightsReserved')}
                </>
              )}
            </p>
            {!standaloneMode && (
              <HStack gap="md" wrap>
                {footerLinks.policies.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </HStack>
            )}
          </div>
        </Container>
      </div>
    </footer>
  );
};
