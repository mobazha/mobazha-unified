'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useNftOtc, NftOrderStatus } from '@mobazha/core';
import { calculatePlatformFee, calculateSellerAmount, DEMO_NFTS } from '@mobazha/core';
import {
  ArrowLeft,
  Wallet,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  MessageCircle,
  User,
} from 'lucide-react';

const STATUS_MAP: Record<NftOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }> = {
  [NftOrderStatus.Active]: { label: '待交易', variant: 'default', icon: <Clock className="h-4 w-4" /> },
  [NftOrderStatus.Completed]: { label: '已完成', variant: 'secondary', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  [NftOrderStatus.Cancelled]: { label: '已取消', variant: 'destructive', icon: <XCircle className="h-4 w-4" /> },
};

export default function NftOtcOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orderId = params.orderId as string;

  const {
    currentNftOrder,
    isLoadingOrder,
    isProcessing,
    error,
    isConnected,
    address,
    loadOrder,
    executeSwap,
    cancelOrder,
    formatAddress,
    getExplorerLink,
    clearError,
  } = useNftOtc();

  const [nftImage, setNftImage] = useState<string | null>(null);
  const [nftName, setNftName] = useState<string>('');

  // 加载订单
  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    }
  }, [orderId, loadOrder]);

  // 获取 NFT 信息
  useEffect(() => {
    if (currentNftOrder) {
      const demoNft = DEMO_NFTS.find(
        (nft) => nft.tokenId === currentNftOrder.tokenId
      );
      if (demoNft) {
        setNftImage(demoNft.image);
        setNftName(demoNft.name);
      }
    }
  }, [currentNftOrder]);

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
        description: 'NFT 已成功转移到您的钱包',
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
        description: '您的 NFT 已解除锁定',
      });
    }
  }, [orderId, cancelOrder, toast]);

  // 判断角色
  const isSeller = address && currentNftOrder?.seller.toLowerCase() === address.toLowerCase();
  const isBuyer = address && currentNftOrder?.seller.toLowerCase() !== address.toLowerCase();

  // 计算费用
  const numPrice = currentNftOrder ? parseFloat(currentNftOrder.price) : 0;
  const platformFee = calculatePlatformFee(numPrice);
  const sellerAmount = calculateSellerAmount(numPrice);

  // 状态信息
  const statusInfo = currentNftOrder ? STATUS_MAP[currentNftOrder.status] : null;

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
          <Skeleton className="aspect-square rounded-xl" />
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
  if (!currentNftOrder) {
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
            <h1 className="text-2xl font-bold">私密 NFT 交易</h1>
            <p className="text-muted-foreground">
              订单 ID: {formatAddress(orderId)}
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
        {/* NFT 预览 */}
        <Card>
          <CardContent className="p-0">
            <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
              {nftImage ? (
                <Image
                  src={nftImage}
                  alt={nftName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No Image
                </div>
              )}
            </div>
            <div className="p-4">
              <h2 className="text-xl font-bold">{nftName || `Token #${currentNftOrder.tokenId}`}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Token ID: #{currentNftOrder.tokenId}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 交易信息 */}
        <div className="space-y-4">
          {/* 价格信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">价格信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">出售价格</span>
                <span className="text-2xl font-bold">${currentNftOrder.price} USDT</span>
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
                    {formatAddress(currentNftOrder.seller)}
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
          {currentNftOrder.status === NftOrderStatus.Active && (
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
                        `购买 NFT - ${currentNftOrder.price} USDT`
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      点击购买后，将自动进行代币授权和交易
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
          {currentNftOrder.status === NftOrderStatus.Completed && (
            <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CardContent className="flex items-center gap-3 pt-6">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    交易已完成
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    NFT 已成功转移给买家
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentNftOrder.status === NftOrderStatus.Cancelled && (
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
