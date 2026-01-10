'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { StepIndicator, NftCard, ShareLinks } from '@/components/Otc';
import { useNftOtc } from '@mobazha/core';
import { getContractAddress, DEFAULT_CHAIN_ID, calculatePlatformFee, calculateSellerAmount } from '@mobazha/core';
import { ArrowLeft, Wallet, Loader2 } from 'lucide-react';
import Image from 'next/image';

const STEPS = [
  { id: 1, label: '选择 NFT' },
  { id: 2, label: '设置价格' },
  { id: 3, label: '分享链接' },
];

export default function CreateNftOtcPage() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    userNfts,
    selectedNft,
    createOrderStep,
    orderPrice,
    generatedOrderId,
    isLoadingNfts,
    isProcessing,
    error,
    isConnected,
    address,
    loadUserNfts,
    selectNft,
    setCreateOrderStep,
    setOrderPrice,
    createOrder,
    generateShareLinks,
    resetCreateOrder,
    clearError,
  } = useNftOtc();

  const [price, setPrice] = useState<string>('100');

  // 处理错误显示
  useEffect(() => {
    if (error) {
      toast({
        title: '错误',
        description: error,
        variant: 'destructive',
      });
      clearError();
    }
  }, [error, toast, clearError]);

  // 重置状态
  useEffect(() => {
    return () => {
      resetCreateOrder();
    };
  }, [resetCreateOrder]);

  // 下一步
  const handleNextStep = useCallback(() => {
    if (createOrderStep === 1 && selectedNft) {
      setCreateOrderStep(2);
    }
  }, [createOrderStep, selectedNft, setCreateOrderStep]);

  // 上一步
  const handlePrevStep = useCallback(() => {
    if (createOrderStep > 1) {
      setCreateOrderStep(createOrderStep - 1);
    }
  }, [createOrderStep, setCreateOrderStep]);

  // 创建订单
  const handleCreateOrder = useCallback(async () => {
    if (!selectedNft) return;

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast({
        title: '价格无效',
        description: '请输入有效的价格',
        variant: 'destructive',
      });
      return;
    }

    setOrderPrice(numPrice);

    const result = await createOrder({
      nftContract: selectedNft.contractAddress,
      tokenId: selectedNft.tokenId,
      price: numPrice,
      paymentToken: getContractAddress('USDT', DEFAULT_CHAIN_ID),
    });

    if (result?.success) {
      toast({
        title: '订单创建成功',
        description: '现在可以分享链接给买家了',
      });
    }
  }, [selectedNft, price, setOrderPrice, createOrder, toast]);

  // 完成
  const handleComplete = useCallback(() => {
    resetCreateOrder();
    router.push('/');
  }, [resetCreateOrder, router]);

  // 获取分享链接
  const shareLinks = generatedOrderId ? generateShareLinks(generatedOrderId) : null;

  // 计算费用
  const numPrice = parseFloat(price) || 0;
  const platformFee = calculatePlatformFee(numPrice);
  const sellerAmount = calculateSellerAmount(numPrice);

  // 未连接钱包
  if (!isConnected) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card className="text-center">
          <CardContent className="py-12">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">请连接钱包</h2>
            <p className="mt-2 text-muted-foreground">
              连接您的钱包以创建私密 NFT 订单
            </p>
            <Button className="mt-6" onClick={() => router.push('/wallet')}>
              连接钱包
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* 页面头部 */}
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">创建私密 NFT 挂单</h1>
          <p className="text-muted-foreground">
            将您的 NFT 创建为私密订单，分享给粉丝购买
          </p>
        </div>
      </div>

      {/* 步骤指示器 */}
      <StepIndicator steps={STEPS} currentStep={createOrderStep} className="mb-8" />

      {/* 步骤 1: 选择 NFT */}
      {createOrderStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>选择要出售的 NFT</CardTitle>
            <CardDescription>
              选择一个您持有的 NFT 进行私密出售
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingNfts ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : userNfts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {userNfts.map((nft) => (
                  <NftCard
                    key={nft.tokenId}
                    nft={nft}
                    isSelected={selectedNft?.tokenId === nft.tokenId}
                    onClick={() => selectNft(nft)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">您还没有可出售的 NFT</p>
                <Button className="mt-4" variant="outline" onClick={loadUserNfts}>
                  刷新
                </Button>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleNextStep}
                disabled={!selectedNft}
                size="lg"
              >
                下一步
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤 2: 设置价格 */}
      {createOrderStep === 2 && selectedNft && (
        <Card>
          <CardHeader>
            <CardTitle>设置出售价格</CardTitle>
            <CardDescription>
              为您的 NFT 设定一个价格
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 选中的 NFT 预览 */}
            <div className="mb-6 flex items-center gap-4 rounded-lg bg-muted/50 p-4">
              {selectedNft.metadata.image && (
                <div className="relative h-20 w-20 overflow-hidden rounded-lg">
                  <Image
                    src={selectedNft.metadata.image}
                    alt={selectedNft.metadata.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h3 className="font-semibold">{selectedNft.metadata.name}</h3>
                <p className="text-sm text-muted-foreground">
                  #{selectedNft.tokenId} · {selectedNft.metadata.creator}
                </p>
              </div>
            </div>

            {/* 价格输入 */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  出售价格 (USDT)
                </label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="输入价格"
                  min="0"
                  step="0.01"
                  className="text-lg"
                />
              </div>

              {/* 费用明细 */}
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">出售价格</span>
                  <span>${numPrice.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">平台费用 (5%)</span>
                  <span className="text-destructive">-${platformFee.toFixed(2)}</span>
                </div>
                <div className="mt-2 border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>您将收到</span>
                    <span className="text-green-600">${sellerAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={handlePrevStep}>
                上一步
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={isProcessing || numPrice <= 0}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建私密订单'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤 3: 分享链接 */}
      {createOrderStep === 3 && shareLinks && (
        <Card>
          <CardHeader>
            <CardTitle>🎉 订单创建成功</CardTitle>
            <CardDescription>
              复制下方链接，分享给您的粉丝进行购买
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShareLinks links={shareLinks} />

            <div className="mt-6 flex justify-center">
              <Button onClick={handleComplete} size="lg">
                完成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
