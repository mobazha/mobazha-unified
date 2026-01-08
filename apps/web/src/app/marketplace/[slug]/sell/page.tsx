'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

// Types
interface SellerProfile {
  bio: string;
  location: string;
  contactEmail: string;
  website: string;
  businessName: string;
  businessType: string;
}

export default function MarketplaceSellPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [isApplying, setIsApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [profile, setProfile] = useState<SellerProfile>({
    bio: '',
    location: '',
    contactEmail: '',
    website: '',
    businessName: '',
    businessType: 'individual',
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Mock user products
  const userProducts = [
    {
      id: 'up1',
      title: 'Vintage Camera',
      image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&h=200&fit=crop',
      price: 199.99,
    },
    {
      id: 'up2',
      title: 'Leather Wallet',
      image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=200&h=200&fit=crop',
      price: 49.99,
    },
    {
      id: 'up3',
      title: 'Wireless Speaker',
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200&h=200&fit=crop',
      price: 89.99,
    },
  ];

  const handleApply = async () => {
    setIsApplying(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      window.alert(
        'Your seller application has been submitted! You will be notified once approved.'
      );
      router.push(`/marketplace/${slug}`);
    } catch (error) {
      window.alert('Failed to submit application: ' + (error as Error).message);
    } finally {
      setIsApplying(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="lg">
          {/* Back Link */}
          <Link
            href={`/marketplace/${slug}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-slate-900 dark:hover:text-white mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Marketplace
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Become a Seller</h1>
            <p className="text-muted-foreground">
              Complete your seller profile to start listing products in this marketplace
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Seller Profile */}
              <Card>
                <h2 className="text-xl font-bold text-foreground mb-6">Seller Profile</h2>

                <VStack gap="lg">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Bio *
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      placeholder="Tell buyers about yourself and what you sell..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Location
                      </label>
                      <Input
                        value={profile.location}
                        onChange={e => setProfile(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="City, Country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Contact Email
                      </label>
                      <Input
                        type="email"
                        value={profile.contactEmail}
                        onChange={e =>
                          setProfile(prev => ({ ...prev, contactEmail: e.target.value }))
                        }
                        placeholder="seller@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Website (Optional)
                      </label>
                      <Input
                        value={profile.website}
                        onChange={e => setProfile(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Business Type
                      </label>
                      <Select
                        value={profile.businessType}
                        onValueChange={value =>
                          setProfile(prev => ({ ...prev, businessType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {profile.businessType === 'business' && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Business Name
                      </label>
                      <Input
                        value={profile.businessName}
                        onChange={e =>
                          setProfile(prev => ({ ...prev, businessName: e.target.value }))
                        }
                        placeholder="Your business name"
                      />
                    </div>
                  )}
                </VStack>
              </Card>

              {/* Application Message */}
              <Card>
                <h2 className="text-xl font-bold text-foreground mb-4">Application Message</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Write a message to the marketplace administrators explaining why you want to sell
                  in this marketplace.
                </p>
                <textarea
                  value={applicationMessage}
                  onChange={e => setApplicationMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="I would like to join this marketplace because..."
                />
              </Card>

              {/* Select Products to List */}
              <Card>
                <h2 className="text-xl font-bold text-foreground mb-4">Products to List</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Select existing products to list in this marketplace (you can add more later).
                </p>

                {userProducts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {userProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedProducts.includes(product.id)
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-border hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full aspect-square object-cover rounded-lg mb-2"
                        />
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {product.title}
                        </p>
                        <p className="text-sm text-emerald-600">${product.price}</p>
                        {selectedProducts.includes(product.id) && (
                          <div className="mt-2 flex items-center gap-1 text-emerald-600 text-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Selected
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 mb-4">You don&apos;t have any products yet.</p>
                    <Link href="/listing/new">
                      <Button variant="outline">Create Your First Product</Button>
                    </Link>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Summary Card */}
              <Card className="sticky top-4">
                <h3 className="font-semibold text-foreground mb-4">Application Summary</h3>

                <VStack gap="md" className="mb-6">
                  <HStack justify="between">
                    <span className="text-muted-foreground">Products Selected</span>
                    <span className="font-medium text-foreground">{selectedProducts.length}</span>
                  </HStack>
                  <HStack justify="between">
                    <span className="text-muted-foreground">Profile Complete</span>
                    <span
                      className={`font-medium ${profile.bio ? 'text-emerald-600' : 'text-amber-600'}`}
                    >
                      {profile.bio ? 'Yes' : 'No'}
                    </span>
                  </HStack>
                </VStack>

                <Button
                  className="w-full"
                  onClick={handleApply}
                  disabled={isApplying || !profile.bio}
                >
                  {isApplying ? 'Submitting...' : 'Submit Application'}
                </Button>

                <p className="text-xs text-slate-500 mt-4 text-center">
                  By applying, you agree to the marketplace&apos;s terms and conditions.
                </p>
              </Card>

              {/* Info Card */}
              <Card>
                <h3 className="font-semibold text-foreground mb-4">What Happens Next?</h3>
                <VStack gap="md" className="text-sm text-muted-foreground">
                  <HStack gap="sm" align="start">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      1
                    </span>
                    <span>Your application will be reviewed by marketplace admins</span>
                  </HStack>
                  <HStack gap="sm" align="start">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      2
                    </span>
                    <span>You&apos;ll receive a notification when approved</span>
                  </HStack>
                  <HStack gap="sm" align="start">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      3
                    </span>
                    <span>Start listing and selling your products!</span>
                  </HStack>
                </VStack>
              </Card>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
