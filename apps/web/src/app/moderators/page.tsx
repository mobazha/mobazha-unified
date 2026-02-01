'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { Search, CheckCircle, Star, Shield, X, ChevronRight, Filter, Users } from 'lucide-react';

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

// Moderator Card Component
function ModeratorListCard({ moderator }: { moderator: Moderator }) {
  const { t } = useI18n();

  return (
    <Link href={`/moderators/${moderator.id}`}>
      <Card className="group relative p-5 border border-border/60 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer">
        <HStack gap="lg" align="start">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={moderator.avatar}
              alt={moderator.name}
              className="w-16 h-16 rounded-full bg-muted ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
            />
            {moderator.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-background">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Name and Verified Badge */}
            <HStack gap="sm" align="center" className="mb-1.5">
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {moderator.name}
              </h3>
              {moderator.verified && (
                <Badge
                  variant="secondary"
                  className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 text-xs"
                >
                  <Shield className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </HStack>

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {moderator.shortDescription}
            </p>

            {/* Stats Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Rating */}
              <HStack gap="xs" align="center">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-semibold text-foreground">{moderator.rating}</span>
                <span className="text-muted-foreground text-sm">({moderator.ratingCount})</span>
              </HStack>

              <span className="w-px h-4 bg-border" />

              {/* Disputes */}
              <HStack gap="xs" align="center">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {moderator.disputesHandled} {t('moderator.disputes')}
                </span>
              </HStack>

              <span className="w-px h-4 bg-border" />

              {/* Success Rate with mini progress bar */}
              <HStack gap="sm" align="center">
                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${moderator.successRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-primary">{moderator.successRate}%</span>
              </HStack>
            </div>

            {/* Languages */}
            <HStack gap="sm" className="mt-3">
              {moderator.languages.map(lang => (
                <span
                  key={lang}
                  className="text-xs px-2.5 py-1 bg-muted/60 text-muted-foreground rounded-full border border-border/50"
                >
                  {lang}
                </span>
              ))}
            </HStack>
          </div>

          {/* Fee Badge */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <div className="px-4 py-2 bg-primary/10 rounded-xl text-center min-w-[80px]">
              <p className="text-xl font-bold text-primary">{moderator.fee}%</p>
              <p className="text-xs text-muted-foreground">{t('moderator.fee')}</p>
            </div>

            {/* View Profile hint on hover */}
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              View Profile
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </HStack>
      </Card>
    </Link>
  );
}

// Active Filters Component
function ActiveFilters({
  selectedLanguage,
  maxFee,
  verifiedOnly,
  onClearLanguage,
  onClearMaxFee,
  onClearVerified,
  onClearAll,
}: {
  selectedLanguage: string;
  maxFee: string;
  verifiedOnly: boolean;
  onClearLanguage: () => void;
  onClearMaxFee: () => void;
  onClearVerified: () => void;
  onClearAll: () => void;
}) {
  const hasFilters = selectedLanguage !== 'all' || maxFee !== 'all' || verifiedOnly;

  if (!hasFilters) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {selectedLanguage !== 'all' && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 bg-primary/10 text-primary border-primary/20"
        >
          {selectedLanguage}
          <button
            onClick={e => {
              e.preventDefault();
              onClearLanguage();
            }}
            className="ml-1 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}

      {maxFee !== 'all' && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 bg-primary/10 text-primary border-primary/20"
        >
          Max {maxFee}%
          <button
            onClick={e => {
              e.preventDefault();
              onClearMaxFee();
            }}
            className="ml-1 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}

      {verifiedOnly && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 bg-primary/10 text-primary border-primary/20"
        >
          Verified only
          <button
            onClick={e => {
              e.preventDefault();
              onClearVerified();
            }}
            className="ml-1 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}

      <button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}

export default function ModeratorsPage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [maxFee, setMaxFee] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'fee' | 'disputes'>('rating');

  // Filter and sort moderators
  const filteredModerators = useMemo(() => {
    return mockModerators
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
  }, [searchQuery, selectedLanguage, maxFee, verifiedOnly, sortBy]);

  // Get unique languages
  const allLanguages = Array.from(new Set(mockModerators.flatMap(m => m.languages)));

  // Sort options for display
  const sortLabels: Record<string, string> = {
    rating: t('moderator.highestRating'),
    fee: t('moderator.lowestFee'),
    disputes: t('moderator.mostDisputes'),
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedLanguage('all');
    setMaxFee('all');
    setVerifiedOnly(false);
    setSortBy('rating');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">{t('moderator.title')}</h1>
            </div>
            <p className="text-muted-foreground ml-13">{t('moderator.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4 p-5 border border-border/60 shadow-sm">
                <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">{t('filter.filters')}</h3>
                </div>

                <VStack gap="lg">
                  {/* Search */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t('common.search')}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t('moderator.searchPlaceholder')}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Language Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
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
                    <label className="text-sm font-medium text-foreground mb-2 block">
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
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        verifiedOnly
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/40 group-hover:border-primary/60'
                      }`}
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                    >
                      {verifiedOnly && (
                        <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">{t('moderator.verifiedOnly')}</span>
                  </label>

                  {/* Sort */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
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
                  <Button variant="outline" className="w-full" onClick={clearAllFilters}>
                    {t('moderator.resetFilters')}
                  </Button>
                </VStack>
              </Card>
            </div>

            {/* Moderators List */}
            <div className="lg:col-span-3">
              {/* List Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredModerators.length}</span>{' '}
                  moderator(s) found
                </p>
                <p className="text-sm text-muted-foreground">
                  Sorted by:{' '}
                  <span className="font-medium text-foreground">{sortLabels[sortBy]}</span>
                </p>
              </div>

              {/* Active Filters */}
              <div className="mb-4">
                <ActiveFilters
                  selectedLanguage={selectedLanguage}
                  maxFee={maxFee}
                  verifiedOnly={verifiedOnly}
                  onClearLanguage={() => setSelectedLanguage('all')}
                  onClearMaxFee={() => setMaxFee('all')}
                  onClearVerified={() => setVerifiedOnly(false)}
                  onClearAll={clearAllFilters}
                />
              </div>

              {/* Moderators Grid */}
              <VStack gap="md">
                {filteredModerators.map(moderator => (
                  <ModeratorListCard key={moderator.id} moderator={moderator} />
                ))}

                {filteredModerators.length === 0 && (
                  <Card className="border border-border/60 shadow-sm">
                    <VStack gap="md" align="center" className="py-12">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-foreground mb-1">
                          {t('moderator.noModeratorsFound')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your filters to find more moderators
                        </p>
                      </div>
                      <Button variant="outline" onClick={clearAllFilters}>
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
