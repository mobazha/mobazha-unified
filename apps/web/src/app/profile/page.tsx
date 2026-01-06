'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack, Grid } from '@mobazha/ui';
import { Button, Avatar, Card } from '@mobazha/ui';

// Types
interface ContactInfo {
  email?: string;
  phoneNumber?: string;
  website?: string;
}

interface Profile {
  peerID: string;
  name: string;
  shortDescription?: string;
  location?: string;
  about?: string;
  avatarHashes?: {
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  headerHashes?: {
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  contactInfo?: ContactInfo;
  stats: {
    listingCount: number;
    followerCount: number;
    followingCount: number;
    ratingCount: number;
    averageRating: number;
  };
}

// Mock profile data
const mockProfile: Profile = {
  peerID: 'QmMyPeerID123456',
  name: 'John Doe',
  shortDescription:
    'Passionate about decentralized commerce and crypto. Building the future of e-commerce.',
  location: 'San Francisco, CA',
  about: `Welcome to my store! I've been selling quality products on Mobazha since 2020.

I specialize in electronics, collectibles, and handmade crafts. Every item is carefully selected and verified for authenticity.

**Why buy from me?**
- Fast shipping (usually within 24 hours)
- Quality guarantee on all products
- Responsive customer service
- Secure crypto payments

Feel free to reach out if you have any questions!`,
  avatarHashes: {
    medium: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  },
  headerHashes: {
    large: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop',
  },
  contactInfo: {
    email: 'john@example.com',
    phoneNumber: '+1 (555) 123-4567',
    website: 'https://johndoe.com',
  },
  stats: {
    listingCount: 45,
    followerCount: 234,
    followingCount: 56,
    ratingCount: 128,
    averageRating: 4.8,
  },
};

// Mock listings
const mockListings = [
  {
    id: '1',
    slug: 'premium-headphones',
    title: 'Premium Wireless Headphones',
    price: 299.99,
    currency: '$',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
  },
  {
    id: '2',
    slug: 'smart-watch',
    title: 'Smart Watch Pro',
    price: 449.99,
    currency: '$',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
  },
  {
    id: '3',
    slug: 'vintage-camera',
    title: 'Vintage Film Camera',
    price: 189.99,
    currency: '$',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop',
  },
  {
    id: '4',
    slug: 'designer-sunglasses',
    title: 'Designer Sunglasses',
    price: 159.99,
    currency: '$',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
  },
];

type TabType = 'store' | 'about' | 'reviews';

export default function ProfilePage() {
  const [profile] = useState<Profile>(mockProfile);
  const [activeTab, setActiveTab] = useState<TabType>('store');
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: profile.name,
    shortDescription: profile.shortDescription || '',
    location: profile.location || '',
    about: profile.about || '',
    email: profile.contactInfo?.email || '',
    phoneNumber: profile.contactInfo?.phoneNumber || '',
    website: profile.contactInfo?.website || '',
  });

  const handleEditChange = useCallback((field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    // In real app, this would call the API
    console.log('Saving profile:', editForm);
    setIsEditing(false);
  }, [editForm]);

  const handleCancel = useCallback(() => {
    setEditForm({
      name: profile.name,
      shortDescription: profile.shortDescription || '',
      location: profile.location || '',
      about: profile.about || '',
      email: profile.contactInfo?.email || '',
      phoneNumber: profile.contactInfo?.phoneNumber || '',
      website: profile.contactInfo?.website || '',
    });
    setIsEditing(false);
  }, [profile]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main>
        {/* Header Banner */}
        <div className="relative h-48 md:h-64 bg-gradient-to-r from-emerald-500 to-teal-600">
          {profile.headerHashes?.large && (
            <img
              src={profile.headerHashes.large}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <Container size="xl" className="relative">
          {/* Profile Info Section */}
          <div className="relative -mt-16 mb-8">
            <Card padding="lg">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0 -mt-20 md:-mt-24">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-white">
                    {profile.avatarHashes?.medium ? (
                      <img
                        src={profile.avatarHashes.medium}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <span className="text-4xl font-bold text-emerald-600">
                          {profile.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <HStack justify="between" align="start" className="mb-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                        {profile.name}
                      </h1>
                      {profile.location && (
                        <p className="text-slate-500 flex items-center gap-1 mt-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {profile.location}
                        </p>
                      )}
                    </div>
                    <HStack gap="sm" className="flex-shrink-0">
                      <Link href="/settings">
                        <Button variant="outline" className="whitespace-nowrap">
                          <svg
                            className="w-4 h-4 md:mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span className="hidden md:inline">Settings</span>
                        </Button>
                      </Link>
                      <Button onClick={() => setIsEditing(true)} className="whitespace-nowrap">
                        <svg
                          className="w-4 h-4 md:mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span className="hidden md:inline">Edit Profile</span>
                      </Button>
                    </HStack>
                  </HStack>

                  {profile.shortDescription && (
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {profile.shortDescription}
                    </p>
                  )}

                  {/* Stats */}
                  <HStack gap="lg" className="flex-wrap">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {profile.stats.listingCount}
                      </div>
                      <div className="text-sm text-slate-500">Listings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {profile.stats.followerCount}
                      </div>
                      <div className="text-sm text-slate-500">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {profile.stats.followingCount}
                      </div>
                      <div className="text-sm text-slate-500">Following</div>
                    </div>
                    <div className="text-center">
                      <HStack gap="xs" align="center" justify="center">
                        <span className="text-amber-500">★</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                          {profile.stats.averageRating}
                        </span>
                      </HStack>
                      <div className="text-sm text-slate-500">
                        {profile.stats.ratingCount} reviews
                      </div>
                    </div>
                  </HStack>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mb-6">
            {(['store', 'about', 'reviews'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'store' ? 'My Store' : tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="pb-12">
            {activeTab === 'store' && (
              <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
                {mockListings.map(listing => (
                  <Link key={listing.id} href={`/product/${listing.slug}`}>
                    <Card hoverable className="overflow-hidden h-full">
                      <div className="aspect-square bg-slate-100 dark:bg-slate-800">
                        <img
                          src={listing.image}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2 mb-2">
                          {listing.title}
                        </h3>
                        <p className="text-lg font-bold text-emerald-600">
                          {listing.currency}
                          {listing.price.toFixed(2)}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
                {/* Add New Listing Card */}
                <Link href="/listing/new">
                  <Card
                    hoverable
                    className="h-full flex flex-col items-center justify-center min-h-[280px] border-2 border-dashed border-slate-300 dark:border-slate-600"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      Add New Listing
                    </span>
                  </Card>
                </Link>
              </Grid>
            )}

            {activeTab === 'about' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card padding="lg">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">About</h2>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      {profile.about?.split('\n').map((paragraph, i) => (
                        <p key={i} className="text-slate-600 dark:text-slate-400 mb-4">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </Card>
                </div>
                <div>
                  <Card padding="lg">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                      Contact Information
                    </h2>
                    <VStack gap="md">
                      {profile.contactInfo?.email && (
                        <HStack gap="sm" align="center">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-slate-500"
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
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Email</p>
                            <a
                              href={`mailto:${profile.contactInfo.email}`}
                              className="text-emerald-600 hover:underline"
                            >
                              {profile.contactInfo.email}
                            </a>
                          </div>
                        </HStack>
                      )}
                      {profile.contactInfo?.phoneNumber && (
                        <HStack gap="sm" align="center">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-slate-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Phone</p>
                            <a
                              href={`tel:${profile.contactInfo.phoneNumber}`}
                              className="text-emerald-600 hover:underline"
                            >
                              {profile.contactInfo.phoneNumber}
                            </a>
                          </div>
                        </HStack>
                      )}
                      {profile.contactInfo?.website && (
                        <HStack gap="sm" align="center">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-slate-500"
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
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Website</p>
                            <a
                              href={profile.contactInfo.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:underline"
                            >
                              {profile.contactInfo.website}
                            </a>
                          </div>
                        </HStack>
                      )}
                    </VStack>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <Card padding="lg">
                <HStack justify="between" align="center" className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reviews</h2>
                  <HStack gap="sm" align="center">
                    <span className="text-amber-500 text-2xl">★</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {profile.stats.averageRating}
                    </span>
                    <span className="text-slate-500">({profile.stats.ratingCount} reviews)</span>
                  </HStack>
                </HStack>

                {/* Mock Reviews */}
                <VStack gap="md">
                  {[
                    {
                      user: 'Alice',
                      rating: 5,
                      comment: 'Excellent seller! Fast shipping and great communication.',
                      date: '2024-01-15',
                    },
                    {
                      user: 'Bob',
                      rating: 5,
                      comment: 'Product exactly as described. Would buy again!',
                      date: '2024-01-10',
                    },
                    {
                      user: 'Charlie',
                      rating: 4,
                      comment: 'Good quality item. Shipping took a bit longer than expected.',
                      date: '2024-01-05',
                    },
                  ].map((review, index) => (
                    <div
                      key={index}
                      className="pb-4 border-b border-slate-200 dark:border-slate-700 last:border-0"
                    >
                      <HStack gap="sm" align="center" className="mb-2">
                        <Avatar name={review.user} size="sm" />
                        <span className="font-medium text-slate-900 dark:text-white">
                          {review.user}
                        </span>
                        <HStack gap="xs" className="ml-auto">
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
                      <p className="text-xs text-slate-400 mt-1">{review.date}</p>
                    </div>
                  ))}
                </VStack>
              </Card>
            )}
          </div>
        </Container>
      </main>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <HStack justify="between" align="center" className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </HStack>

              <VStack gap="md">
                {/* Profile Information */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Profile Information</h3>
                  <VStack gap="sm">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => handleEditChange('name', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Your name"
                        maxLength={40}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Bio
                      </label>
                      <input
                        type="text"
                        value={editForm.shortDescription}
                        onChange={e => handleEditChange('shortDescription', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="A short description about yourself"
                        maxLength={140}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={e => handleEditChange('location', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="City, Country"
                      />
                    </div>
                  </VStack>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Contact Information</h3>
                  <VStack gap="sm">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => handleEditChange('email', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editForm.phoneNumber}
                        onChange={e => handleEditChange('phoneNumber', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={e => handleEditChange('website', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </VStack>
                </div>

                {/* About */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">About</h3>
                  <textarea
                    value={editForm.about}
                    onChange={e => handleEditChange('about', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="Tell others about yourself and your store..."
                  />
                </div>
              </VStack>

              <HStack
                gap="sm"
                justify="end"
                className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700"
              >
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </HStack>
            </div>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}
