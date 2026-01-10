'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useErc3525Otc, Erc3525OrderStatus, DEMO_RWA_ASSETS } from '@mobazha/core';
import { calculatePlatformFee, calculateSellerAmount } from '@mobazha/core';
import {
  ArrowLeft,
  Wallet,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Ticket,
  MessageCircle,
  User,
  BarChart3,
} from 'lucide-react';

const STATUS_MAP: Record<Erc3525OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }> = {
  [Erc3525OrderStatus.Active]: { label: '待交易', variant: 'default', icon: <Clock className="h-4 w-4" /> },
  [Erc3525OrderStatus.Completed]: { label: '已完成', variant: 'secondary', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  [Erc3525OrderStatus.Cancelled]: { label: '已取消', variant: 'destructive', icon: <XCircle className="h-4 w-4" /> },
};

export default function RwaOtcOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orderId = params.orderId as string;

  const {
    currentRwaOrder,
    isLoadingOrder,
    isProcessing,
    error,
    isConnected,
    address,
    loadOrder,
    executeSwap,
    cancelOrder,
    getExpectedRevenue,
    formatAddress,
    formatCurrency,
    clearError,
  } = useErc3525Otc();

  const [assetInfo, setAssetInfo] = useState<typeof DEMO_RWA_ASSETS[0] | null>(null);
  const [expectedRevenue, setExpectedRevenue] = useState({ weekly: 0, annualized: 0 });

  // 加载订单
  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    }
  }, [orderId, loadOrder]);

  // 获取资产信息
  useEffect(() => {
    if (currentRwaOrder) {
      const asset = DEMO_RWA_ASSETS.find(a => a.tokenId === currentRwaOrder.tokenId);
      if (asset) {
        setAssetInfo(asset);
        // 计算按出售份额的预期收益
        const ratio = currentRwaOrder.shares / asset.totalShares;
        setExpectedRevenue({
          weekly: asset.expectedRevenue.weekly * ratio,
          annualized: asset.expectedRevenue.annualized * ratio,
        });
      }
    }
  }, [currentRwaOrder]);

  // 处理错误
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

  // 执行购买
  const handleBuy = useCallback(async () => {
    if (!orderId) return;

    const result = await executeSwap(orderId);
    if (result?.success) {
      toast({
        title: '购买成功',
        description: '份额已成功转移到您的钱包',
      });
    }
  }, [orderId, executeSwap, toast]);

  // 取消订单
  const handleCancel = useCallback(async () => {
    if (!orderId) return;

    const result = await cancelOrder(orderId);
    if (result?.success) {
      toast({
        title: '订单已取消',
        description: '您的份额已解除锁定',
      });
    }
  }, [orderId, cancelOrder, toast]);

  // 判断角色
  const isSeller = address && currentRwaOrder?.seller.toLowerCase() === address.toLowerCase();
  const isBuyer = address && currentRwaOrder?.seller.toLowerCase() !== address.toLowerCase();

  // 计算费用
  const numPrice = currentRwaOrder ? parseFloat(currentRwaOrder.price) : 0;
  const platformFee = calculatePlatformFee(numPrice);
  const sellerAmount = calculateSellerAmount(numPrice);

  // 状态信息
  const statusInfo = currentRwaOrder ? STATUS_MAP[currentRwaOrder.status] : null;

  // 未连接钱包
  if (!isConnected) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card className="text-center">
          <CardContent className="py-12">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">请连接钱包</h2>
            <p className="mt-2 text-muted-foreground">
              连接您的钱包以查看和参与交易
            </p>
            <Button className="mt-6" onClick={() => router.push('/wallet')}>
              连接钱包
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 加载中
  if (isLoadingOrder) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // 订单不存在
  if (!currentRwaOrder) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card className="text-center">
          <CardContent className="py-12">
            <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">订单不存在</h2>
            <p className="mt-2 text-muted-foreground">
              该订单可能已被取消或不存在
            </p>
            <Button className="mt-6" variant="outline" onClick={() => router.back()}>
              返回
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* 页面头部 */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">RWA 份额交易</h1>
            <p className="text-muted-foreground">
              订单 ID: {orderId.slice(0, 8)}...
            </p>
          </div>
        </div>
        {statusInfo && (
          <Badge variant={statusInfo.variant} className="gap-1">
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 资产信息 */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                  <Ticket className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">
                    {assetInfo?.name || `Token #${currentRwaOrder.tokenId}`}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Token ID: {currentRwaOrder.tokenId}
                  </p>
                </div>
              </div>

              {assetInfo?.description && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {assetInfo.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 份额信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                份额信息
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">出售份额</p>
                <p className="text-2xl font-bold">
                  {currentRwaOrder.shares.toLocaleString()}
                </p>
              </div>
              {assetInfo && (
                <div>
                  <p className="text-sm text-muted-foreground">总份额</p>
                  <p className="text-2xl font-bold">
                    {assetInfo.totalShares.toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 预期收益 */}
          <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-green-700 dark:text-green-400">
                <TrendingUp className="h-5 w-5" />
                预期收益（买入后）
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-green-600/80 dark:text-green-500/80">周收益</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  ${expectedRevenue.weekly.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-600/80 dark:text-green-500/80">年化收益</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  ${expectedRevenue.annualized.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 交易信息 */}
        <div className="space-y-4">
          {/* 价格信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">价格信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">总价</span>
                <span className="text-2xl font-bold">${currentRwaOrder.price} USDT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  每份价格
                </span>
                <span>
                  ${(numPrice / currentRwaOrder.shares).toFixed(2)}/份
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">平台费用 (5%)</span>
                <span className="text-destructive">-${platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>卖家到账</span>
                <span className="text-green-600">${sellerAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 交易方信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">交易方</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">卖家</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {formatAddress(currentRwaOrder.seller)}
                  </span>
                  {isSeller && (
                    <Badge variant="outline" className="text-xs">
                      我
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          {currentRwaOrder.status === Erc3525OrderStatus.Active && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                {isBuyer && (
                  <>
                    <Button
                      onClick={handleBuy}
                      disabled={isProcessing}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        `购买 ${currentRwaOrder.shares} 份 - ${currentRwaOrder.price} USDT`
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      购买后您将获得 {currentRwaOrder.shares} 份收益份额
                    </p>
                  </>
                )}

                {isSeller && (
                  <Button
                    onClick={handleCancel}
                    disabled={isProcessing}
                    variant="destructive"
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      '取消订单'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* 完成/取消状态 */}
          {currentRwaOrder.status === Erc3525OrderStatus.Completed && (
            <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CardContent className="flex items-center gap-3 pt-6">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    交易已完成
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    份额已成功转移给买家
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentRwaOrder.status === Erc3525OrderStatus.Cancelled && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="flex items-center gap-3 pt-6">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <h3 className="font-semibold text-destructive">订单已取消</h3>
                  <p className="text-sm text-destructive/80">该订单已被卖家取消</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 聊天入口 */}
          <Card>
            <CardContent className="pt-6">
              <Button variant="outline" className="w-full gap-2">
                <MessageCircle className="h-4 w-4" />
                与卖家私密聊天
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                使用端到端加密进行安全沟通
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
