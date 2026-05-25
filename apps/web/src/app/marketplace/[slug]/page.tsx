'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Badge } from '@/components/ui/badge';
import { useCommunityMarketplaceDetail, useI18n } from '@mobazha/core';
import { ExternalLink, Package, RefreshCw, Search, ShieldCheck, Store, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type DetailTab = 'products' | 'sellers' | 'about';

const platformLabels: Record<string, string> = {
  telegram: 'Telegram',
  discord: 'Discord',
};

function marketplaceLogo(publicID: string, logoURL?: string) {
  return logoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(publicID)}`;
}

export default function MarketplaceDetailPage() {
  const params = useParams();
  const { t } = useI18n();
  const { toast } = useToast();
  const slugParam = params.slug;
  const identifier = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  const { detail, loading, error, refresh } = useCommunityMarketplaceDetail(identifier);
  const [activeTab, setActiveTab] = useState<DetailTab>('products');
  const [searchQuery, setSearchQuery] = useState('');

  const marketplace = detail?.marketplace;
  const listingRefs = useMemo(() => detail?.listings.listings ?? [], [detail]);
  const sellers = detail?.sellers ?? [];

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return listingRefs;
    return listingRefs.filter(
      listing => listing.slug.toLowerCase().includes(q) || listing.peerID.toLowerCase().includes(q)
    );
  }, [listingRefs, searchQuery]);

  const handleJoinGuidance = () => {
    toast({
      title: '通过社区群组加入',
      description: '请先加入对应 Telegram/Discord 社区。成员验证和卖家申请会走真实群组权限。',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8">
          <Container size="xl">
            <Card className="h-72 animate-pulse bg-muted/50" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="h-40 animate-pulse bg-muted/50" />
              <Card className="h-40 animate-pulse bg-muted/50" />
              <Card className="h-40 animate-pulse bg-muted/50" />
            </div>
          </Container>
        </main>
      </div>
    );
  }

  if (error || !marketplace) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MobilePageHeader title={t('marketplace.title')} />
        <main className="py-8">
          <Container size="xl">
            <Card className="p-8 text-center">
              <VStack gap="md" align="center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Store className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="mb-2 text-xl font-bold text-foreground">市场不可用</h1>
                  <p className="text-sm text-muted-foreground">
                    {error || '该社区市场不存在，或尚未被运营激活公开展示。'}
                  </p>
                </div>
                <HStack gap="sm" className="flex-wrap justify-center">
                  <Button variant="outline" onClick={refresh}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新加载
                  </Button>
                  <Link href="/marketplace">
                    <Button>{t('marketplace.backToMarketplace')}</Button>
                  </Link>
                </HStack>
              </VStack>
            </Card>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  const platformName = platformLabels[marketplace.platform] || marketplace.platform;
  const logo = marketplaceLogo(marketplace.publicID, marketplace.logoURL);
  const description = marketplace.publicDescription || '真实社区驱动的市场。';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={marketplace.name} />

      <main>
        <div className="relative h-44 bg-muted sm:h-60 md:h-72">
          {marketplace.bannerURL ? (
            <img
              src={marketplace.bannerURL}
              alt={`${marketplace.name} banner`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_25%_25%,hsl(var(--primary)/0.25),transparent_35%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <Container size="xl">
          <div className="relative -mt-16 mb-6 sm:-mt-20 sm:mb-8">
            <Card className="p-4 sm:p-6">
              <HStack gap="lg" align="start" className="flex-wrap">
                <img
                  src={logo}
                  alt={marketplace.name}
                  className="-mt-12 h-24 w-24 rounded-xl border-4 border-background bg-card object-cover shadow-lg sm:-mt-16 sm:h-32 sm:w-32"
                />
                <div className="min-w-0 flex-1">
                  <HStack justify="between" align="start" className="flex-wrap gap-4">
                    <div className="min-w-0">
                      <HStack gap="sm" align="center" className="mb-2 flex-wrap">
                        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                          {marketplace.name}
                        </h1>
                        {marketplace.isFeatured && <Badge>精选</Badge>}
                        <Badge variant="secondary">{platformName}</Badge>
                      </HStack>
                      <p className="mb-4 max-w-3xl text-sm text-muted-foreground sm:text-base">
                        {description}
                      </p>
                      <HStack gap="lg" className="flex-wrap">
                        <VStack gap="none">
                          <span className="text-2xl font-bold text-foreground">
                            {marketplace.sellerCount}
                          </span>
                          <span className="text-sm text-muted-foreground">卖家</span>
                        </VStack>
                        <VStack gap="none">
                          <span className="text-2xl font-bold text-foreground">
                            {marketplace.productCount}
                          </span>
                          <span className="text-sm text-muted-foreground">商品</span>
                        </VStack>
                        <VStack gap="none">
                          <span className="text-2xl font-bold text-foreground">
                            {detail.listings.total}
                          </span>
                          <span className="text-sm text-muted-foreground">可浏览引用</span>
                        </VStack>
                      </HStack>
                    </div>
                    <VStack gap="sm" className="w-full sm:w-auto">
                      <Button onClick={handleJoinGuidance} className="w-full sm:w-auto">
                        通过群组加入
                      </Button>
                      <Link href={`/marketplace/${marketplace.slug || marketplace.publicID}/sell`}>
                        <Button variant="outline" className="w-full sm:w-auto">
                          申请成为卖家
                        </Button>
                      </Link>
                    </VStack>
                  </HStack>
                </div>
              </HStack>
            </Card>
          </div>

          <div className="mb-6 overflow-x-auto border-b border-border">
            <HStack gap="none" className="min-w-max">
              {(['products', 'sellers', 'about'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'products' && '商品'}
                  {tab === 'sellers' && '卖家'}
                  {tab === 'about' && '关于'}
                </button>
              ))}
            </HStack>
          </div>

          {activeTab === 'products' && (
            <div>
              <div className="mb-5">
                <Input
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="搜索此市场的商品引用..."
                  className="h-11 text-sm"
                  leftIcon={<Search className="h-5 w-5 text-muted-foreground" />}
                />
              </div>

              {filteredListings.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredListings.map(listing => (
                    <Card key={`${listing.peerID}:${listing.slug}`} className="p-4">
                      <HStack gap="md" align="start">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-foreground">{listing.slug}</h3>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            卖家 PeerID: {listing.peerID}
                          </p>
                          <Link href={`/store/${listing.peerID}`}>
                            <Button variant="ghost" size="sm" className="mt-3 px-0">
                              查看卖家店铺
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </HStack>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="py-12 text-center">
                  <VStack gap="md" align="center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-lg font-semibold text-foreground">暂无可浏览商品</h3>
                      <p className="text-sm text-muted-foreground">
                        只有已批准且可见的卖家商品会展示在这里。
                      </p>
                    </div>
                  </VStack>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'sellers' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sellers.length > 0 ? (
                sellers.map(seller => (
                  <Link key={seller.sellerID} href={`/store/${seller.peerID}`}>
                    <Card className="h-full p-4 transition-all hover:shadow-lg active:scale-[0.99]">
                      <HStack gap="md" align="center">
                        <img
                          src={`https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seller.peerID)}`}
                          alt={seller.peerID}
                          className="h-14 w-14 rounded-full bg-muted object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-foreground">
                            {seller.peerID}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {seller.productGroups.reduce((sum, group) => sum + group.itemCount, 0)}{' '}
                            商品
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {seller.productGroups.map(group => group.name).join(', ') ||
                              '暂无商品组'}
                          </p>
                        </div>
                      </HStack>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="col-span-full py-12 text-center">
                  <VStack gap="md" align="center">
                    <Users className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">暂无公开可见卖家。</p>
                  </VStack>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2">
                <h2 className="mb-4 text-xl font-bold text-foreground">关于这个市场</h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </Card>
              <div className="space-y-4">
                <Card className="p-5">
                  <HStack gap="sm" align="center" className="mb-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">可信信号</h3>
                  </HStack>
                  <VStack gap="sm" className="text-sm text-muted-foreground">
                    <span>来源平台：{platformName}</span>
                    <span>加入方式：群成员验证</span>
                    <span>公开状态：已激活</span>
                  </VStack>
                </Card>
                <Card className="p-5">
                  <HStack gap="sm" align="center" className="mb-3">
                    <Store className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">运营规则</h3>
                  </HStack>
                  <p className="text-sm text-muted-foreground">
                    平台只展示运营激活的真实社区市场；卖家和商品需要通过现有群组集市审核流程。
                  </p>
                </Card>
              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
