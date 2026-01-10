'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { StepIndicator, RwaHoldingCard, ShareLinks } from '@/components/Otc';
import { useErc3525Otc, DEMO_RWA_ASSETS } from '@mobazha/core';
import { getContractAddress, DEFAULT_CHAIN_ID, calculatePlatformFee, calculateSellerAmount } from '@mobazha/core';
import { ArrowLeft, Wallet, Loader2, TrendingUp } from 'lucide-react';

const STEPS = [
  { id: 1, label: '选择份额' },
  { id: 2, label: '设置价格' },
  { id: 3, label: '完成创建' },
];

export default function CreateRwaOtcPage() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    userHoldings,
    selectedHolding,
    sharesToSell,
    createOrderStep,
    orderPrice,
    generatedOrderId,
    isLoadingHoldings,
    isProcessing,
    error,
    isConnected,
    address,
    loadUserHoldings,
    selectHolding,
    setSharesToSell,
    setCreateOrderStep,
    setOrderPrice,
    createOrder,
    getExpectedRevenue,
    generateShareLinks,
    resetCreateOrder,
    clearError,
  } = useErc3525Otc();

  const [pricePerShare, setPricePerShare] = useState<string>('50');
  const [expectedRevenue, setExpectedRevenue] = useState({ weekly: 0, annualized: 0 });

  // 获取预期收益
  useEffect(() => {
    if (selectedHolding) {
      const demoAsset = DEMO_RWA_ASSETS.find(a => a.tokenId === selectedHolding.tokenId);
      if (demoAsset) {
        setExpectedRevenue(demoAsset.expectedRevenue);
      }
    }
  }, [selectedHolding]);

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
    if (createOrderStep === 1 && selectedHolding) {
      setCreateOrderStep(2);
    }
  }, [createOrderStep, selectedHolding, setCreateOrderStep]);

  // 上一步
  const handlePrevStep = useCallback(() => {
    if (createOrderStep > 1) {
      setCreateOrderStep(createOrderStep - 1);
    }
  }, [createOrderStep, setCreateOrderStep]);

  // 创建订单
  const handleCreateOrder = useCallback(async () => {
    if (!selectedHolding) return;

    const numPricePerShare = parseFloat(pricePerShare);
    if (isNaN(numPricePerShare) || numPricePerShare <= 0) {
      toast({
        title: '价格无效',
        description: '请输入有效的价格',
        variant: 'destructive',
      });
      return;
    }

    const totalPrice = numPricePerShare * sharesToSell;
    setOrderPrice(totalPrice);

    const result = await createOrder({
      rwaToken: getContractAddress('BroadwaySwap', DEFAULT_CHAIN_ID),
      tokenId: selectedHolding.tokenId,
      shares: sharesToSell,
      price: totalPrice,
      paymentToken: getContractAddress('USDT', DEFAULT_CHAIN_ID),
    });

    if (result?.success) {
      toast({
        title: '订单创建成功',
        description: '份额订单已创建，可以分享给买家',
      });
    }
  }, [selectedHolding, pricePerShare, sharesToSell, setOrderPrice, createOrder, toast]);

  // 完成
  const handleComplete = useCallback(() => {
    resetCreateOrder();
    router.push('/');
  }, [resetCreateOrder, router]);

  // 获取分享链接
  const shareLinks = generatedOrderId ? generateShareLinks(generatedOrderId) : null;

  // 计算费用
  const numPricePerShare = parseFloat(pricePerShare) || 0;
  const totalPrice = numPricePerShare * sharesToSell;
  const platformFee = calculatePlatformFee(totalPrice);
  const sellerAmount = calculateSellerAmount(totalPrice);

  // 计算按份额的预期收益
  const revenueRatio = selectedHolding ? sharesToSell / selectedHolding.value : 0;
  const sellingRevenue = {
    weekly: expectedRevenue.weekly * revenueRatio,
    annualized: expectedRevenue.annualized * revenueRatio,
  };

  // 未连接钱包
  if (!isConnected) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card className="text-center">
          <CardContent className="py-12">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">请连接钱包</h2>
            <p className="mt-2 text-muted-foreground">
              连接您的钱包以创建 RWA 份额订单
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
          <h1 className="text-2xl font-bold">创建 RWA 份额订单</h1>
          <p className="text-muted-foreground">
            出售您持有的音乐剧票房收益份额
          </p>
        </div>
      </div>

      {/* 步骤指示器 */}
      <StepIndicator steps={STEPS} currentStep={createOrderStep} className="mb-8" />

      {/* 步骤 1: 选择份额 */}
      {createOrderStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>选择要出售的份额</CardTitle>
            <CardDescription>
              选择您持有的 ERC3525 收益份额进行出售
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHoldings ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : userHoldings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {userHoldings.map((holding) => {
                  const asset = DEMO_RWA_ASSETS.find(a => a.tokenId === holding.tokenId);
                  return (
                    <RwaHoldingCard
                      key={holding.tokenId}
                      holding={holding}
                      expectedRevenue={asset?.expectedRevenue}
                      isSelected={selectedHolding?.tokenId === holding.tokenId}
                      onClick={() => selectHolding(holding)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">您还没有可出售的 RWA 份额</p>
                <Button className="mt-4" variant="outline" onClick={loadUserHoldings}>
                  刷新
                </Button>
              </div>
            )}

            {/* 选择出售数量 */}
            {selectedHolding && (
              <div className="mt-6 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">出售份额数量</span>
                  <span className="text-lg font-bold">
                    {sharesToSell} / {selectedHolding.value}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={selectedHolding.value}
                  value={sharesToSell}
                  onChange={(e) => setSharesToSell(parseInt(e.target.value))}
                  className="mt-4 w-full"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>{selectedHolding.value}</span>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleNextStep}
                disabled={!selectedHolding || sharesToSell === 0}
                size="lg"
              >
                下一步
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤 2: 设置价格 */}
      {createOrderStep === 2 && selectedHolding && (
        <Card>
          <CardHeader>
            <CardTitle>设置出售价格</CardTitle>
            <CardDescription>
              为您的 {sharesToSell} 份 {selectedHolding.name} 设定价格
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 选中的份额预览 */}
            <div className="mb-6 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedHolding.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    出售 {sharesToSell} 份，共 {selectedHolding.value} 份
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span>周收益: ${sellingRevenue.weekly.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 价格输入 */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  每份价格 (USDT)
                </label>
                <Input
                  type="number"
                  value={pricePerShare}
                  onChange={(e) => setPricePerShare(e.target.value)}
                  placeholder="输入每份价格"
                  min="0"
                  step="0.01"
                  className="text-lg"
                />
              </div>

              {/* 总价和费用明细 */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">每份价格</span>
                  <span>${numPricePerShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">出售数量</span>
                  <span>× {sharesToSell} 份</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-muted-foreground">总价</span>
                  <span className="font-bold">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">平台费用 (5%)</span>
                  <span className="text-destructive">-${platformFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>您将收到</span>
                  <span className="text-green-600">${sellerAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* 收益对比提示 */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 text-sm">
                <p className="text-amber-700 dark:text-amber-400">
                  💡 提示：这 {sharesToSell} 份份额的预期年化收益为 ${sellingRevenue.annualized.toFixed(2)}，
                  请确保出售价格合理。
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={handlePrevStep}>
                上一步
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={isProcessing || totalPrice <= 0}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建份额订单'
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
            <CardTitle>🎉 份额订单创建成功</CardTitle>
            <CardDescription>
              复制下方链接，分享给潜在买家
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
