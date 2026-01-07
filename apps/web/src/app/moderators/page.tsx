'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@mobazha/ui';
import { Button, Card, Input } from '@mobazha/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useI18n } from '@mobazha/core';

// Types
interface Moderator {
  id: string;
  name: string;
  avatar: string;
  shortDescription: string;
  languages: string[];
  fee: number;
  verified: boolean;
  rating: number;
  ratingCount: number;
  disputesHandled: number;
  successRate: number;
}

// Mock data
const mockModerators: Moderator[] = [
  {
    id: 'mod1',
    name: 'TrustGuard',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=trustguard',
    shortDescription: 'Professional mediator with 5+ years experience in crypto disputes',
    languages: ['English', 'Spanish'],
    fee: 1,
    verified: true,
    rating: 4.9,
    ratingCount: 342,
    disputesHandled: 456,
    successRate: 98,
  },
  {
    id: 'mod2',
    name: 'SafeEscrow',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=safeescrow',
    shortDescription: 'Fast and fair dispute resolution, 24/7 availability',
    languages: ['English', 'Chinese', 'Japanese'],
    fee: 0.5,
    verified: true,
    rating: 4.7,
    ratingCount: 189,
    disputesHandled: 234,
    successRate: 96,
  },
  {
    id: 'mod3',
    name: 'CryptoMediator',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=cryptomediator',
    shortDescription: 'Specializing in digital goods and NFT transactions',
    languages: ['English', 'German'],
    fee: 1.5,
    verified: false,
    rating: 4.8,
    ratingCount: 127,
    disputesHandled: 167,
    successRate: 97,
  },
  {
    id: 'mod4',
    name: 'FairDeal',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=fairdeal',
    shortDescription: 'Community trusted moderator, low fees for small transactions',
    languages: ['English', 'French', 'Portuguese'],
    fee: 0.75,
    verified: true,
    rating: 4.6,
    ratingCount: 256,
    disputesHandled: 312,
    successRate: 95,
  },
  {
    id: 'mod5',
    name: 'DisputeResolver',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=resolver',
    shortDescription: 'Expert in physical goods shipping disputes',
    languages: ['English', 'Russian'],
    fee: 1.25,
    verified: true,
    rating: 4.85,
    ratingCount: 198,
    disputesHandled: 278,
    successRate: 99,
  },
];

export default function ModeratorsPage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [maxFee, setMaxFee] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'fee' | 'disputes'>('rating');

  // Filter and sort moderators
  const filteredModerators = mockModerators
    .filter(mod => {
      if (searchQuery && !mod.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedLanguage !== 'all' && !mod.languages.includes(selectedLanguage)) {
        return false;
      }
      if (maxFee !== 'all' && mod.fee > Number(maxFee)) {
        return false;
      }
      if (verifiedOnly && !mod.verified) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'fee':
          return a.fee - b.fee;
        case 'disputes':
          return b.disputesHandled - a.disputesHandled;
        default:
          return 0;
      }
    });

  // Get unique languages
  const allLanguages = Array.from(new Set(mockModerators.flatMap(m => m.languages)));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {t('moderator.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{t('moderator.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <Card padding="lg" className="sticky top-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                  {t('filter.filters')}
                </h3>

                <VStack gap="lg">
                  {/* Search */}
                  <div>
                    <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                      {t('common.search')}
                    </label>
                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={t('moderator.searchPlaceholder')}
                    />
                  </div>

                  {/* Language Filter */}
                  <div>
                    <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                      {t('moderator.language')}
                    </label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('moderator.allLanguages')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('moderator.allLanguages')}</SelectItem>
                        {allLanguages.map(lang => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Max Fee Filter */}
                  <div>
                    <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                      {t('moderator.maxFee')}
                    </label>
                    <Select value={maxFee} onValueChange={setMaxFee}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('moderator.anyFee')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('moderator.anyFee')}</SelectItem>
                        <SelectItem value="0.5">Up to 0.5%</SelectItem>
                        <SelectItem value="1">Up to 1%</SelectItem>
                        <SelectItem value="1.5">Up to 1.5%</SelectItem>
                        <SelectItem value="2">Up to 2%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Verified Only */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={e => setVerifiedOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {t('moderator.verifiedOnly')}
                    </span>
                  </label>

                  {/* Sort */}
                  <div>
                    <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                      {t('moderator.sortBy')}
                    </label>
                    <Select
                      value={sortBy}
                      onValueChange={value => setSortBy(value as typeof sortBy)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">{t('moderator.highestRating')}</SelectItem>
                        <SelectItem value="fee">{t('moderator.lowestFee')}</SelectItem>
                        <SelectItem value="disputes">{t('moderator.mostDisputes')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reset */}
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedLanguage('all');
                      setMaxFee('all');
                      setVerifiedOnly(false);
                      setSortBy('rating');
                    }}
                  >
                    {t('moderator.resetFilters')}
                  </Button>
                </VStack>
              </Card>
            </div>

            {/* Moderators List */}
            <div className="lg:col-span-3">
              <div className="mb-4">
                <p className="text-sm text-slate-500">
                  {t('moderator.moderatorsFound', { count: filteredModerators.length })}
                </p>
              </div>

              <VStack gap="md">
                {filteredModerators.map(moderator => (
                  <Link key={moderator.id} href={`/moderators/${moderator.id}`}>
                    <Card padding="lg" hoverable className="transition-all hover:shadow-lg">
                      <HStack gap="lg" align="start">
                        {/* Avatar */}
                        <img
                          src={moderator.avatar}
                          alt={moderator.name}
                          className="w-16 h-16 rounded-full bg-slate-200"
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <HStack gap="sm" align="center" className="mb-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {moderator.name}
                            </h3>
                            {moderator.verified && (
                              <svg
                                className="w-5 h-5 text-blue-500 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </HStack>

                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                            {moderator.shortDescription}
                          </p>

                          {/* Stats */}
                          <HStack gap="lg" wrap>
                            <HStack gap="xs" align="center">
                              <span className="text-amber-500">⭐</span>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {moderator.rating}
                              </span>
                              <span className="text-slate-500 text-sm">
                                ({moderator.ratingCount})
                              </span>
                            </HStack>

                            <span className="text-slate-300 dark:text-slate-600">|</span>

                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {t('moderator.disputesHandled', {
                                count: moderator.disputesHandled,
                              })}
                            </span>

                            <span className="text-slate-300 dark:text-slate-600">|</span>

                            <span className="text-sm text-emerald-600">
                              {t('moderator.success', { rate: moderator.successRate })}
                            </span>
                          </HStack>

                          {/* Languages */}
                          <HStack gap="sm" className="mt-2">
                            {moderator.languages.map(lang => (
                              <span
                                key={lang}
                                className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded"
                              >
                                {lang}
                              </span>
                            ))}
                          </HStack>
                        </div>

                        {/* Fee */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-bold text-emerald-600">{moderator.fee}%</p>
                          <p className="text-sm text-slate-500">{t('moderator.fee')}</p>
                        </div>
                      </HStack>
                    </Card>
                  </Link>
                ))}

                {filteredModerators.length === 0 && (
                  <Card padding="lg">
                    <VStack gap="md" align="center" className="py-8">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        {t('moderator.noModeratorsFound')}
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedLanguage('all');
                          setMaxFee('all');
                          setVerifiedOnly(false);
                        }}
                      >
                        {t('marketplace.clearFilters')}
                      </Button>
                    </VStack>
                  </Card>
                )}
              </VStack>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
