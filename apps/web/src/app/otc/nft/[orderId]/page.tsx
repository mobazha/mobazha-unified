'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { useI18n, useChatStore } from '@mobazha/core';
import { useNftOtc } from '@mobazha/core/hooks/useOtc';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  MessageSquare,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { getOtcConfig, DEFAULT_CHAIN_ID } from '@mobazha/core/config/otcConfig';

// OTC 订单状态枚举
enum NftOrderStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
}

export default function NftOtcDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { t } = useI18n();
  const openChatDrawer = useChatStore(state => state.openDrawer);

  // 使用 NFT OTC Hook
  const {
    isConnected,
    address,
    currentNftOrder,
    isLoadingOrder,
    isProcessing,
    error,
    loadOrder,
    executeSwap,
    cancelOrder,
    formatAddress,
    clearError,
  } = useNftOtc();

  const networkConfig = getOtcConfig(DEFAULT_CHAIN_ID);

  const [copied, setCopied] = useState(false);

  // 加载订单
  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    }
  }, [orderId, loadOrder]);

  // NFT 元数据（TODO: 从链上获取真实数据）
  const nftMetadata = useMemo(() => {
    if (!currentNftOrder) return null;
    return {
      name: `NFT #${currentNftOrder.tokenId}`,
      description: '这是一个 KOL/明星的限量数字收藏品。',
      image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&h=600&fit=crop',
    };
  }, [currentNftOrder]);

  // 判断当前用户是否是卖家
  const isSeller = useMemo(() => {
    if (!currentNftOrder || !address) return false;
    return currentNftOrder.seller.toLowerCase() === address.toLowerCase();
  }, [currentNftOrder, address]);

  // 判断当前用户是否可以购买
  const canBuy = useMemo(() => {
    return isConnected && currentNftOrder?.status === NftOrderStatus.Active && !isSeller;
  }, [isConnected, currentNftOrder?.status, isSeller]);

  // 订单状态文本
  const statusText = useMemo(() => {
    if (!currentNftOrder) return '';
    const texts = {
      [NftOrderStatus.Active]: t('otc.status.active') || '活跃',
      [NftOrderStatus.Completed]: t('otc.status.completed') || '已成交',
      [NftOrderStatus.Cancelled]: t('otc.status.cancelled') || '已取消',
    };
    return texts[currentNftOrder.status];
  }, [currentNftOrder, t]);

  // 执行购买
  const handleExecuteSwap = async () => {
    if (!currentNftOrder || !canBuy) return;

    clearError();
    const result = await executeSwap(orderId);

    if (result?.success) {
      window.alert(t('otc.purchaseSuccess') || '购买成功！');
    }
  };

  // 取消订单
  const handleCancelOrder = async () => {
    if (!currentNftOrder || !isSeller || currentNftOrder.status !== NftOrderStatus.Active) return;

    if (!window.confirm(t('otc.confirmCancel') || '确定要取消此订单吗？')) return;

    clearError();
    const result = await cancelOrder(orderId);

    if (result?.success) {
      window.alert(t('otc.cancelSuccess') || '订单已取消');
    }
  };

  // 复制链接
  const copyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 打开聊天
  const handleOpenChat = () => {
    openChatDrawer();
    // TODO: 自动选择与卖家的对话
  };

  if (isLoadingOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container size="lg" className="py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton variant="rectangular" className="aspect-square rounded-xl" />
            <VStack gap="md" align="stretch">
              <Skeleton variant="text" className="h-8 w-3/4" />
              <Skeleton variant="text" className="h-6 w-1/2" />
              <Skeleton variant="rectangular" className="h-40 rounded-lg" />
              <Skeleton variant="rectangular" className="h-12 rounded-lg" />
            </VStack>
          </div>
        </Container>
        <Footer />
      </div>
    );
  }

  if (error || !currentNftOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container size="lg" className="py-20">
          <VStack gap="md" align="center">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <h2 className="text-xl font-semibold">
              {error || t('otc.orderNotFound') || '订单不存在'}
            </h2>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back') || '返回'}
            </Button>
          </VStack>
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
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back') || '返回'}
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 左侧：NFT 图片 */}
          <div className="aspect-square bg-muted rounded-xl overflow-hidden">
            {nftMetadata?.image ? (
              <img
                src={nftMetadata.image}
                alt={nftMetadata.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">🎨</span>
              </div>
            )}
          </div>

          {/* 右侧：订单信息 */}
          <VStack gap="lg" align="stretch">
            {/* 标题和状态 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">NFT</Badge>
                <Badge
                  variant={currentNftOrder.status === NftOrderStatus.Active ? 'default' : 'outline'}
                >
                  {statusText}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">
                {nftMetadata?.name || `NFT #${currentNftOrder.tokenId}`}
              </h1>
              {nftMetadata?.description && (
                <p className="text-muted-foreground mt-2">{nftMetadata.description}</p>
              )}
            </div>

            {/* 价格 */}
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">{t('otc.price') || '价格'}</div>
                <div className="text-3xl font-bold text-primary">{currentNftOrder.price} USDT</div>
              </CardContent>
            </Card>

            {/* 合约信息 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('otc.contractInfo') || '合约信息'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">NFT 合约</span>
                  <a
                    href={`${networkConfig.blockExplorerUrl}/address/${currentNftOrder.nftContract}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    {formatAddress(currentNftOrder.nftContract)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Token ID</span>
                  <span className="text-sm font-medium">#{currentNftOrder.tokenId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('otc.seller') || '卖家'}</span>
                  <a
                    href={`${networkConfig.blockExplorerUrl}/address/${currentNftOrder.seller}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    {formatAddress(currentNftOrder.seller)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {t('otc.network') || '网络'}
                  </span>
                  <span className="text-sm font-medium">{networkConfig.chainName}</span>
                </div>
              </CardContent>
            </Card>

            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 操作按钮 */}
            <VStack gap="sm">
              {currentNftOrder.status === NftOrderStatus.Active && (
                <>
                  {!isConnected ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-2">请先连接钱包</p>
                      <p className="text-sm text-muted-foreground">
                        点击页面右上角的「连接钱包」按钮
                      </p>
                    </div>
                  ) : canBuy ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleExecuteSwap}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('otc.purchasing') || '购买中...'}
                        </>
                      ) : (
                        t('otc.buyNow') || '立即购买'
                      )}
                    </Button>
                  ) : isSeller ? (
                    <Button
                      className="w-full"
                      size="lg"
                      variant="destructive"
                      onClick={handleCancelOrder}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('otc.cancelling') || '取消中...'}
                        </>
                      ) : (
                        t('otc.cancelOrder') || '取消订单'
                      )}
                    </Button>
                  ) : null}
                </>
              )}

              {currentNftOrder.status === NftOrderStatus.Completed && (
                <div className="text-center py-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    {t('otc.transactionCompleted') || '交易已完成'}
                  </p>
                </div>
              )}

              {currentNftOrder.status === NftOrderStatus.Cancelled && (
                <div className="text-center py-4 bg-muted rounded-lg">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">
                    {t('otc.orderCancelled') || '订单已取消'}
                  </p>
                </div>
              )}

              {/* 辅助操作 */}
              <HStack gap="sm" className="w-full">
                <Button variant="outline" className="flex-1" onClick={handleOpenChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t('otc.chatWithSeller') || '联系卖家'}
                </Button>
                <Button variant="outline" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </HStack>
            </VStack>
          </VStack>
        </div>
      </Container>

      <Footer />
    </div>
  );
}
