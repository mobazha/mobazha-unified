'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { useI18n, useWallet, useUserStore } from '@mobazha/core';
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Loader2, Share2 } from 'lucide-react';
import { getOtcConfig, getContractAddress } from '@mobazha/core/config/otcConfig';

// 步骤枚举
enum Step {
  SelectNft = 1,
  SetPrice = 2,
  ShareLink = 3,
}

// NFT 持仓类型
interface NftHolding {
  tokenId: number;
  name: string;
  image: string;
  contractAddress: string;
}

export default function CreateNftOtcPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isConnected, walletInfo, connectWallet } = useWallet();
  const { isAuthenticated, profile } = useUserStore();
  
  const networkConfig = getOtcConfig();

  const [currentStep, setCurrentStep] = useState<Step>(Step.SelectNft);
  const [selectedNft, setSelectedNft] = useState<NftHolding | null>(null);
  const [price, setPrice] = useState('100');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Mock NFT 持仓数据
  const [nftHoldings] = useState<NftHolding[]>([
    {
      tokenId: 1,
      name: 'KOL 限量签名照 #1',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop',
      contractAddress: getContractAddress('ExampleNFT'),
    },
    {
      tokenId: 2,
      name: '演唱会纪念 NFT #2',
      image: 'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=300&h=300&fit=crop',
      contractAddress: getContractAddress('ExampleNFT'),
    },
    {
      tokenId: 3,
      name: '游戏主播签名头像 #3',
      image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=300&fit=crop',
      contractAddress: getContractAddress('ExampleNFT'),
    },
  ]);

  // 步骤标题
  const stepTitles = useMemo(() => ({
    [Step.SelectNft]: t('otc.step.selectNft') || '选择 NFT',
    [Step.SetPrice]: t('otc.step.setPrice') || '设定价格',
    [Step.ShareLink]: t('otc.step.shareLink') || '分享链接',
  }), [t]);

  // 选择 NFT
  const handleSelectNft = (nft: NftHolding) => {
    setSelectedNft(nft);
  };

  // 下一步
  const handleNext = () => {
    if (currentStep === Step.SelectNft && selectedNft) {
      setCurrentStep(Step.SetPrice);
    } else if (currentStep === Step.SetPrice && parseFloat(price) > 0) {
      handleCreateOrder();
    }
  };

  // 上一步
  const handlePrev = () => {
    if (currentStep === Step.SetPrice) {
      setCurrentStep(Step.SelectNft);
    }
  };

  // 创建订单
  const handleCreateOrder = async () => {
    if (!selectedNft || !price) return;
    
    setCreating(true);
    try {
      // TODO: 实际调用合约创建订单
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 生成订单 ID
      const orderId = `0x${Date.now().toString(16)}`;
      setCreatedOrderId(orderId);
      setCurrentStep(Step.ShareLink);
    } catch (err) {
      console.error('Failed to create order:', err);
      alert(t('otc.createFailed') || '创建订单失败');
    } finally {
      setCreating(false);
    }
  };

  // 获取分享链接
  const shareLink = useMemo(() => {
    if (!createdOrderId) return '';
    return `${window.location.origin}/otc/nft/${createdOrderId}`;
  }, [createdOrderId]);

  // 复制链接
  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 分享到 Telegram
  const shareToTelegram = () => {
    const text = t('otc.shareText') || '我正在出售一个私密 NFT 资产，快来看看！';
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // 查看订单
  const viewOrder = () => {
    router.push(`/otc/nft/${createdOrderId}`);
  };

  // 创建新订单
  const createNewOrder = () => {
    setCurrentStep(Step.SelectNft);
    setSelectedNft(null);
    setPrice('100');
    setCreatedOrderId(null);
  };

  // 返回店铺
  const backToStore = () => {
    if (profile?.peerID) {
      router.push(`/store/${profile.peerID}`);
    } else {
      router.back();
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container size="md" className="py-20">
          <Card className="text-center p-8">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <span className="text-3xl">🔒</span>
              </div>
              <h2 className="text-xl font-semibold">{t('otc.connectWalletRequired') || '请先连接钱包'}</h2>
              <p className="text-muted-foreground">
                {t('otc.connectWalletDesc') || '连接钱包后才能创建 OTC 挂单'}
              </p>
              <Button onClick={connectWallet} size="lg">
                {t('wallet.connect') || '连接钱包'}
              </Button>
            </CardContent>
          </Card>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <Container size="lg" className="py-6">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={backToStore}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('otc.backToStore') || '返回店铺'}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">
              {t('otc.createNftOrder') || '创建 NFT 私密挂单'}
            </CardTitle>
            {/* 步骤指示器 */}
            <div className="flex justify-center gap-2 mt-4">
              {[Step.SelectNft, Step.SetPrice, Step.ShareLink].map((step) => (
                <div
                  key={step}
                  className={`flex items-center ${step !== Step.ShareLink ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step ? <Check className="h-4 w-4" /> : step}
                  </div>
                  {step !== Step.ShareLink && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        currentStep > step ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-muted-foreground mt-2">
              {stepTitles[currentStep]}
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {/* Step 1: 选择 NFT */}
            {currentStep === Step.SelectNft && (
              <VStack gap="lg">
                <p className="text-center text-muted-foreground">
                  {t('otc.selectNftDesc') || '选择您要出售的 NFT'}
                </p>
                <Grid cols={3} colsMobile={2} gap="md">
                  {nftHoldings.map((nft) => (
                    <Card
                      key={nft.tokenId}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedNft?.tokenId === nft.tokenId
                          ? 'ring-2 ring-primary'
                          : ''
                      }`}
                      onClick={() => handleSelectNft(nft)}
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img
                          src={nft.image}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm truncate">{nft.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          #{nft.tokenId}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </Grid>
                <div className="flex justify-end">
                  <Button onClick={handleNext} disabled={!selectedNft}>
                    {t('common.next') || '下一步'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </VStack>
            )}

            {/* Step 2: 设定价格 */}
            {currentStep === Step.SetPrice && selectedNft && (
              <VStack gap="lg">
                {/* 已选 NFT 预览 */}
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="w-20 h-20 rounded-lg overflow-hidden">
                    <img
                      src={selectedNft.image}
                      alt={selectedNft.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">{selectedNft.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Token ID: #{selectedNft.tokenId}
                    </p>
                  </div>
                </div>

                {/* 价格输入 */}
                <div className="space-y-2">
                  <Label>{t('otc.price') || '出售价格'}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min="0.01"
                      step="0.01"
                      className="flex-1"
                    />
                    <div className="flex items-center px-4 bg-muted rounded-md text-muted-foreground">
                      USDT
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('otc.priceDesc') || '买家将使用 USDT 支付购买'}
                  </p>
                </div>

                {/* 平台费说明 */}
                <div className="p-4 bg-muted/50 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    {t('otc.platformFeeNote') || '* 平台收取 5% 交易手续费'}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {t('otc.youWillReceive') || '您将收到'}:{' '}
                    <span className="font-medium text-foreground">
                      {(parseFloat(price || '0') * 0.95).toFixed(2)} USDT
                    </span>
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handlePrev}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('common.prev') || '上一步'}
                  </Button>
                  <Button onClick={handleNext} disabled={creating || parseFloat(price) <= 0}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('otc.creating') || '创建中...'}
                      </>
                    ) : (
                      <>
                        {t('otc.createOrder') || '创建挂单'}
                        <Check className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </VStack>
            )}

            {/* Step 3: 分享链接 */}
            {currentStep === Step.ShareLink && createdOrderId && (
              <VStack gap="lg" align="center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">
                    {t('otc.orderCreated') || '挂单创建成功！'}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {t('otc.shareToSell') || '分享下面的链接给潜在买家'}
                  </p>
                </div>

                {/* 分享链接 */}
                <div className="w-full max-w-md space-y-3">
                  <div className="flex gap-2">
                    <Input value={shareLink} readOnly className="flex-1" />
                    <Button variant="outline" onClick={copyLink}>
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={shareToTelegram}>
                      <Share2 className="h-4 w-4 mr-2" />
                      {t('otc.shareToTelegram') || '分享到 Telegram'}
                    </Button>
                    <Button variant="outline" onClick={viewOrder}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('otc.viewOrder') || '查看订单'}
                    </Button>
                  </div>
                </div>

                <Button variant="link" onClick={createNewOrder}>
                  {t('otc.createAnother') || '创建另一个挂单'}
                </Button>
              </VStack>
            )}
          </CardContent>
        </Card>
      </Container>

      <Footer />
    </div>
  );
}
