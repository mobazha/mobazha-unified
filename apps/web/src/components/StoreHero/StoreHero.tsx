'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  useI18n,
  getImageUrl,
  useStorefrontProfile,
  getBrandConfig,
  stripHtmlTags,
} from '@mobazha/core';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';
import { Store, MapPin, Star, Package, Search } from 'lucide-react';

export function StoreHero() {
  const router = useRouter();
  const { t } = useI18n();
  const profile = useStorefrontProfile();

  const isLoading = !profile;
  const avatarUrl = profile?.avatarHashes?.medium ? getImageUrl(profile.avatarHashes.medium) : null;

  const headerUrl = profile?.headerHashes?.large ? getImageUrl(profile.headerHashes.large) : null;

  const storeName = profile?.name || t('standalone.storeName', { defaultValue: 'Store' });
  const storeAboutRaw = profile?.shortDescription || profile?.about || '';
  const storeAbout = storeAboutRaw ? stripHtmlTags(storeAboutRaw) : '';
  const location = profile?.location;
  const stats = profile?.stats;

  return (
    <section
      data-testid="store-hero"
      className="relative overflow-hidden bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)]"
    >
      {headerUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${headerUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
        <div className="flex flex-col items-center text-center">
          {/* Store Avatar */}
          {isLoading ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 animate-pulse mb-4" />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt={storeName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/30 shadow-lg object-cover mb-4"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/15 border-4 border-white/30 flex items-center justify-center mb-4">
              <Store className="w-8 h-8 sm:w-10 sm:h-10 text-white/70" />
            </div>
          )}

          {/* Store Name */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
            {isLoading ? (
              <span className="inline-block w-48 h-8 bg-white/20 rounded animate-pulse" />
            ) : (
              storeName
            )}
          </h1>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-1.5 text-white/70 mb-3">
              <MapPin className="w-4 h-4" />
              <span className="text-sm sm:text-base">{location}</span>
            </div>
          )}

          {/* About */}
          {storeAbout && (
            <p className="text-white/80 text-sm sm:text-base max-w-2xl mb-6 line-clamp-3">
              {storeAbout}
            </p>
          )}

          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-6 sm:gap-8 mb-6">
              {stats.listingCount > 0 && (
                <div className="flex items-center gap-1.5 text-white/80">
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {stats.listingCount} {t('standalone.products', { defaultValue: 'Products' })}
                  </span>
                </div>
              )}
              {stats.averageRating > 0 && (
                <div className="flex items-center gap-1.5 text-white/80">
                  <Star className="w-4 h-4 fill-current text-amber-500" />
                  <span className="text-sm font-medium">
                    {stats.averageRating.toFixed(1)}
                    {stats.ratingCount > 0 && (
                      <span className="text-white/60 ml-1">({stats.ratingCount})</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Search Box */}
          <form
            className="w-full max-w-lg"
            onSubmit={e => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input');
              const q = input?.value.trim();
              if (q) {
                const dest = profile?.peerID
                  ? `/store/${profile.peerID}?q=${encodeURIComponent(q)}`
                  : `/search?q=${encodeURIComponent(q)}`;
                router.push(dest);
              }
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="search"
                enterKeyHint="search"
                placeholder={t('standalone.searchProducts', { defaultValue: 'Search products...' })}
                className="w-full pl-10 pr-4 py-3 bg-white/15 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
          </form>

          {/* Powered by — hidden when brand.hidePoweredBy is true */}
          {!getBrandConfig()?.hidePoweredBy && (
            <div className="mt-6 flex items-center gap-2 text-white/40">
              <span className="text-xs">Powered by</span>
              <MobazhaLogo size={16} className="text-white/40" />
              <span className="text-xs">Mobazha</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
