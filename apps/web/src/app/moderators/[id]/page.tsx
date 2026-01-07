'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Types
interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer: string;
  date: string;
}

// Mock data
const mockModerator = {
  id: 'mod1',
  name: 'TrustGuard',
  avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=trustguard',
  shortDescription: 'Professional mediator with 5+ years experience in crypto disputes',
  description: `TrustGuard is a professional dispute resolution service with over 5 years of experience in cryptocurrency and e-commerce disputes. 

Our team includes former legal professionals and blockchain experts who understand the unique challenges of decentralized commerce.

**Our Services:**
- Fast dispute resolution (average 48-72 hours)
- 24/7 availability for urgent cases
- Multi-language support
- Transparent decision-making process
- Detailed resolution reports

**Our Commitment:**
We believe in fair and impartial mediation. Every dispute is carefully reviewed, and we consider evidence from all parties before making a decision.`,
  languages: ['English', 'Spanish'],
  fee: {
    percentage: 1,
    feeType: 'percentage' as const,
  },
  termsAndConditions: `1. The moderator fee is non-refundable once a dispute is resolved.
2. All parties must respond within 7 days or forfeit their claim.
3. Evidence submitted must be authentic and unaltered.
4. The moderator's decision is final and binding.
5. Personal information will be kept confidential.`,
  acceptedCurrencies: ['ETH', 'BTC', 'USDT', 'USDC'],
  verified: true,
  stats: {
    rating: 4.9,
    ratingCount: 342,
    disputesHandled: 456,
    averageResolutionTime: 52,
    successRate: 98,
  },
  contactInfo: {
    email: 'support@trustguard.mod',
    website: 'https://trustguard.mod',
    social: {
      twitter: '@trustguard_mod',
      telegram: '@trustguard_support',
    },
  },
  createdAt: '2022-03-15',
};

const mockReviews: Review[] = [
  {
    id: '1',
    rating: 5,
    comment:
      'Excellent moderator! Resolved my dispute quickly and fairly. Very professional communication throughout the process.',
    reviewer: 'CryptoTrader_88',
    date: '2024-01-10',
  },
  {
    id: '2',
    rating: 5,
    comment:
      'TrustGuard handled a complex case involving international shipping. They were thorough and made a well-reasoned decision.',
    reviewer: 'GlobalShopper',
    date: '2024-01-05',
  },
  {
    id: '3',
    rating: 4,
    comment:
      'Good experience overall. The resolution took a bit longer than expected but the outcome was fair.',
    reviewer: 'BuyerProtect',
    date: '2023-12-28',
  },
  {
    id: '4',
    rating: 5,
    comment:
      'Highly recommended! Clear communication and fair judgment. Will use again for future transactions.',
    reviewer: 'SafeDeals2023',
    date: '2023-12-20',
  },
];

export default function ModeratorDetailPage() {
  const params = useParams();
  // id is used for routing, params.id is available
  void params.id;
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'terms'>('about');

  const moderator = mockModerator;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {/* Back Link */}
          <Link
            href="/moderators"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Moderators
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Card */}
              <Card>
                <HStack gap="lg" align="start">
                  <img
                    src={moderator.avatar}
                    alt={moderator.name}
                    className="w-24 h-24 rounded-full bg-slate-200"
                  />

                  <div className="flex-1">
                    <HStack gap="sm" align="center" className="mb-2">
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {moderator.name}
                      </h1>
                      {moderator.verified && (
                        <svg
                          className="w-6 h-6 text-blue-500"
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

                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {moderator.shortDescription}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {moderator.stats.rating}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Rating ({moderator.stats.ratingCount})
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {moderator.stats.disputesHandled}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Disputes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">
                          {moderator.stats.successRate}%
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Success Rate</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          ~{moderator.stats.averageResolutionTime}h
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Avg. Resolution
                        </p>
                      </div>
                    </div>
                  </div>
                </HStack>
              </Card>

              {/* Tabs */}
              <Card>
                <div className="border-b border-slate-200 dark:border-slate-700">
                  <HStack gap="none">
                    {(['about', 'reviews', 'terms'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-4 text-sm font-medium transition-colors capitalize ${
                          activeTab === tab
                            ? 'text-emerald-600 border-b-2 border-emerald-600'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tab === 'terms' ? 'Terms & Conditions' : tab}
                      </button>
                    ))}
                  </HStack>
                </div>

                <div className="p-6">
                  {activeTab === 'about' && (
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                        {moderator.description}
                      </div>

                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                          Languages
                        </h3>
                        <HStack gap="sm">
                          {moderator.languages.map(lang => (
                            <span
                              key={lang}
                              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm"
                            >
                              {lang}
                            </span>
                          ))}
                        </HStack>
                      </div>

                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                          Accepted Currencies
                        </h3>
                        <HStack gap="sm">
                          {moderator.acceptedCurrencies.map(currency => (
                            <span
                              key={currency}
                              className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium"
                            >
                              {currency}
                            </span>
                          ))}
                        </HStack>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <VStack gap="lg">
                      {mockReviews.map(review => (
                        <div
                          key={review.id}
                          className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-0 last:pb-0"
                        >
                          <HStack justify="between" align="center" className="mb-2">
                            <HStack gap="sm" align="center">
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-400">
                                {review.reviewer[0]}
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {review.reviewer}
                              </span>
                            </HStack>
                            <HStack gap="xs">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? 'text-amber-500' : 'text-slate-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </HStack>
                          </HStack>
                          <p className="text-slate-600 dark:text-slate-400">{review.comment}</p>
                          <p className="text-sm text-slate-500 mt-2">{review.date}</p>
                        </div>
                      ))}
                    </VStack>
                  )}

                  {activeTab === 'terms' && (
                    <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {moderator.termsAndConditions}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Fee Card */}
              <Card>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Moderator Fee</h3>
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-emerald-600">{moderator.fee.percentage}%</p>
                  <p className="text-slate-500 mt-1">of transaction value</p>
                </div>
                <Button className="w-full mt-4" size="lg">
                  Select as Moderator
                </Button>
              </Card>

              {/* Contact Info */}
              {moderator.contactInfo && (
                <Card>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                    Contact Information
                  </h3>
                  <VStack gap="md">
                    {moderator.contactInfo.email && (
                      <HStack gap="sm" align="center">
                        <svg
                          className="w-5 h-5 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-slate-600 dark:text-slate-400">
                          {moderator.contactInfo.email}
                        </span>
                      </HStack>
                    )}
                    {moderator.contactInfo.website && (
                      <HStack gap="sm" align="center">
                        <svg
                          className="w-5 h-5 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                          />
                        </svg>
                        <a
                          href={moderator.contactInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline"
                        >
                          {moderator.contactInfo.website}
                        </a>
                      </HStack>
                    )}
                    {moderator.contactInfo.social?.twitter && (
                      <HStack gap="sm" align="center">
                        <svg
                          className="w-5 h-5 text-slate-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span className="text-slate-600 dark:text-slate-400">
                          {moderator.contactInfo.social.twitter}
                        </span>
                      </HStack>
                    )}
                    {moderator.contactInfo.social?.telegram && (
                      <HStack gap="sm" align="center">
                        <svg
                          className="w-5 h-5 text-slate-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        <span className="text-slate-600 dark:text-slate-400">
                          {moderator.contactInfo.social.telegram}
                        </span>
                      </HStack>
                    )}
                  </VStack>
                </Card>
              )}

              {/* Member Since */}
              <Card>
                <HStack justify="between" align="center">
                  <span className="text-slate-600 dark:text-slate-400">Member since</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {new Date(moderator.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </HStack>
              </Card>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
