'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layouts';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';
import {
  useI18n,
  useUserStore,
  getImageUrl,
  useStorefrontMode,
  useStorefrontProfile,
  useUserContext,
  parseScanResult,
  buildProductHref,
  type AddressValidator,
} from '@mobazha/core';
import { Search, ScanLine, LayoutDashboard } from 'lucide-react';
import { usePlatform } from '@mobazha/ui/hooks';
import { useScanQR } from '@/lib/platform';
import { useToast } from '@/components/ui/use-toast';
import { validatePaymentAddressForChain } from '@/lib/paymentAddressValidation';

const COINS_TO_CHECK = ['BTC', 'BCH', 'LTC', 'ZEC', 'ETH'] as const;

const validateCryptoAddress: AddressValidator = (address: string, coinHint?: string) => {
  const coins = coinHint
    ? COINS_TO_CHECK.filter(symbol => symbol === coinHint.toUpperCase())
    : COINS_TO_CHECK;

  for (const symbol of coins) {
    if (validatePaymentAddressForChain(address, symbol)) {
      return { coin: symbol };
    }
  }
  return undefined;
};

export const MobileHeader: React.FC = () => {
  const { isEmbeddedApp } = usePlatform();
  const router = useRouter();
  const { t } = useI18n();
  const { profile, isAuthenticated } = useUserStore();
  const { hasStore } = useUserContext();
  const [searchQuery, setSearchQuery] = useState('');
  const standaloneMode = useStorefrontMode();
  const storefrontProfile = useStorefrontProfile();
  const brandProfile = standaloneMode ? storefrontProfile : profile;
  const scanQR = useScanQR();
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleScan = useCallback(async () => {
    if (!scanQR.isSupported) {
      toast({ description: t('scan.unsupported') });
      return;
    }

    const { result, data } = await scanQR.scan({ text: t('scan.prompt') });

    if (result !== 'scanned' || !data) return;

    const parsed = parseScanResult(data, { validateAddress: validateCryptoAddress });

    switch (parsed.type) {
      case 'store':
        router.push(`/store/${parsed.peerID}`);
        break;
      case 'listing':
        router.push(buildProductHref(parsed.slug, parsed.peerID, { includePeerID: true }));
        break;
      case 'payment':
        try {
          await navigator.clipboard.writeText(parsed.address);
          toast({
            description: t('scan.paymentDetected', {
              coin: parsed.coin,
              address: parsed.address,
            }),
          });
        } catch {
          toast({ description: `${parsed.coin}: ${parsed.address}` });
        }
        break;
      case 'url':
        window.open(parsed.url, '_blank', 'noopener,noreferrer');
        break;
      case 'search':
        toast({ description: t('scan.searchFallback') });
        router.push(`/search?q=${encodeURIComponent(parsed.query)}`);
        break;
    }
  }, [scanQR, router, toast, t]);

  return (
    <header className="md:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <Container size="xl">
        <div className="flex items-center gap-2 h-14 py-2">
          {standaloneMode ? (
            isEmbeddedApp ? (
              <>
                <form onSubmit={handleSearch} className="flex-1 min-w-0">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={t('search.placeholder')}
                      enterKeyHint="search"
                      className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-surface text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    />
                  </div>
                </form>
                {isAuthenticated && hasStore && (
                  <Link
                    href="/admin"
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-hover active:bg-surface-hover transition-colors"
                    aria-label={t('admin.title')}
                  >
                    <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
                  {brandProfile ? (
                    <>
                      <Avatar
                        src={getImageUrl(brandProfile.avatarHashes?.small)}
                        name={brandProfile.name || ''}
                        size="sm"
                      />
                      <span className="font-bold text-base text-foreground truncate">
                        {brandProfile.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <MobazhaLogo size={30} className="text-primary flex-shrink-0" />
                      <span className="font-bold text-base text-foreground truncate">Mobazha</span>
                    </>
                  )}
                </Link>
                {isAuthenticated && hasStore && (
                  <Link
                    href="/admin"
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-hover active:bg-surface-hover transition-colors"
                    aria-label={t('admin.title')}
                  >
                    <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                  </Link>
                )}
              </>
            )
          ) : (
            <>
              <form onSubmit={handleSearch} className="flex-1 min-w-0">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('search.placeholder')}
                    enterKeyHint="search"
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
              </form>

              {isAuthenticated && (
                <Link
                  href="/admin"
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-hover active:bg-surface-hover transition-colors"
                  aria-label={t('userMenu.myStore')}
                >
                  <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                </Link>
              )}

              <button
                onClick={handleScan}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-hover active:bg-surface-hover transition-colors touch-feedback"
                aria-label={t('common.scan')}
              >
                <ScanLine className="h-5 w-5 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
};
