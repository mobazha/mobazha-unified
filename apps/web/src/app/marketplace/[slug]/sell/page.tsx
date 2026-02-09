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
import { useCurrency, useI18n } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';

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
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const { t } = useI18n();
  const { toast } = useToast();
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
      toast({
        title: t('common.success'),
        description: t('marketplace.applicationSubmitted'),
        variant: 'success',
      });
      router.push(`/marketplace/${slug}`);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
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
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('marketplace.sell.backToMarketplace')}
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t('marketplace.sell.title')}
            </h1>
            <p className="text-muted-foreground">{t('marketplace.sell.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Seller Profile */}
              <Card>
                <h2 className="text-xl font-bold text-foreground mb-6">
                  {t('marketplace.sell.sellerProfile')}
                </h2>

                <VStack gap="lg">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      {t('marketplace.sell.bioLabel')}
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder={t('marketplace.sell.bioPlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        {t('marketplace.sell.locationLabel')}
                      </label>
                      <Input
                        value={profile.location}
                        onChange={e => setProfile(prev => ({ ...prev, location: e.target.value }))}
                        placeholder={t('marketplace.sell.locationPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        {t('marketplace.sell.emailLabel')}
                      </label>
                      <Input
                        type="email"
                        value={profile.contactEmail}
                        onChange={e =>
                          setProfile(prev => ({ ...prev, contactEmail: e.target.value }))
                        }
                        placeholder={t('marketplace.sell.emailPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        {t('marketplace.sell.websiteLabel')}
                      </label>
                      <Input
                        value={profile.website}
                        onChange={e => setProfile(prev => ({ ...prev, website: e.target.value }))}
                        placeholder={t('marketplace.sell.websitePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        {t('marketplace.sell.businessTypeLabel')}
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
                          <SelectItem value="individual">
                            {t('marketplace.sell.businessTypeIndividual')}
                          </SelectItem>
                          <SelectItem value="business">
                            {t('marketplace.sell.businessTypeBusiness')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {profile.businessType === 'business' && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        {t('marketplace.sell.businessNameLabel')}
                      </label>
                      <Input
                        value={profile.businessName}
                        onChange={e =>
                          setProfile(prev => ({ ...prev, businessName: e.target.value }))
                        }
                        placeholder={t('marketplace.sell.businessNamePlaceholder')}
                      />
                    </div>
                  )}
                </VStack>
              </Card>

              {/* Application Message */}
              <Card>
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {t('marketplace.sell.applicationMessage')}
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('marketplace.sell.applicationMessageDesc')}
                </p>
                <textarea
                  value={applicationMessage}
                  onChange={e => setApplicationMessage(e.target.value)}
                  rows={4}
                  aria-label={t('marketplace.sell.applicationMessage')}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder={t('marketplace.sell.applicationPlaceholder')}
                />
              </Card>

              {/* Select Products to List */}
              <Card>
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {t('marketplace.sell.productsToList')}
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('marketplace.sell.productsToListDesc')}
                </p>

                {userProducts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {userProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedProducts.includes(product.id)
                            ? 'border-success bg-success/8'
                            : 'border-border hover:border-border'
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
                        <p className="text-sm text-success">
                          {formatCurrencyPrice(product.price, 'USD')}
                        </p>
                        {selectedProducts.includes(product.id) && (
                          <div className="mt-2 flex items-center gap-1 text-success text-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {t('marketplace.sell.selected')}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">{t('marketplace.sell.noProducts')}</p>
                    <Link href="/listing/new">
                      <Button variant="outline">{t('marketplace.sell.createFirstProduct')}</Button>
                    </Link>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Summary Card */}
              <Card className="sticky top-4">
                <h3 className="font-semibold text-foreground mb-4">
                  {t('marketplace.sell.applicationSummary')}
                </h3>

                <VStack gap="md" className="mb-6">
                  <HStack justify="between">
                    <span className="text-muted-foreground">
                      {t('marketplace.sell.productsSelected')}
                    </span>
                    <span className="font-medium text-foreground">{selectedProducts.length}</span>
                  </HStack>
                  <HStack justify="between">
                    <span className="text-muted-foreground">
                      {t('marketplace.sell.profileComplete')}
                    </span>
                    <span
                      className={`font-medium ${profile.bio ? 'text-success' : 'text-warning'}`}
                    >
                      {profile.bio ? t('common.yes') : t('common.no')}
                    </span>
                  </HStack>
                </VStack>

                <Button
                  className="w-full"
                  onClick={handleApply}
                  disabled={isApplying || !profile.bio}
                >
                  {isApplying ? t('common.submitting') : t('marketplace.sell.submitApplication')}
                </Button>

                <p className="text-xs text-muted-foreground mt-4 text-center">
                  {t('marketplace.sell.termsAgreement')}
                </p>
              </Card>

              {/* Info Card */}
              <Card>
                <h3 className="font-semibold text-foreground mb-4">
                  {t('marketplace.sell.whatHappensNext')}
                </h3>
                <VStack gap="md" className="text-sm text-muted-foreground">
                  <HStack gap="sm" align="start">
                    <span className="w-6 h-6 rounded-full bg-success/15 text-success flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      1
                    </span>
                    <span>{t('marketplace.sell.step1')}</span>
                  </HStack>
                  <HStack gap="sm" align="start">
                    <span className="w-6 h-6 rounded-full bg-success/15 text-success flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      2
                    </span>
                    <span>{t('marketplace.sell.step2')}</span>
                  </HStack>
                  <HStack gap="sm" align="start">
                    <span className="w-6 h-6 rounded-full bg-success/15 text-success flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      3
                    </span>
                    <span>{t('marketplace.sell.step3')}</span>
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
