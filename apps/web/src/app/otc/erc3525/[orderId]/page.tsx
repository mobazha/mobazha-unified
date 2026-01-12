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
import { useErc3525Otc } from '@mobazha/core/hooks/useOtc';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  MessageSquare,
  Loader2,
  Check,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { getOtcConfig, DEFAULT_CHAIN_ID } from '@mobazha/core/config/otcConfig';

// ERC3525 OTC 订单状态枚举
enum Erc3525OrderStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
}

export default function Erc3525OtcDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { t } = useI18n();
  const openChatDrawer = useChatStore(state => state.openDrawer);

  // 使用 ERC3525 OTC Hook
  const {
    isConnected,
    address,
    currentRwaOrder,
    isLoadingOrder,
    isProcessing,
    error,
    loadOrder,
    executeSwap,
    cancelOrder,
    formatAddress,
    clearError,
  } = useErc3525Otc();

  const networkConfig = getOtcConfig(DEFAULT_CHAIN_ID);

  const [copied, setCopied] = useState(false);

  // 加载订单
  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    }
  }, [orderId, loadOrder]);

  // RWA 元数据（TODO: 从链上获取真实数据）
  const rwaMetadata = useMemo(() => {
    if (!currentRwaOrder) return null;
    return {
      name: 'Starlight Dreams 票房份额',
      description:
        '参与全球巡演音乐剧 "Starlight Dreams" 的票房收益分成。持有者可按份额比例获得每周收益分红。',
      projectName: 'Starlight Dreams',
      totalShares: 10000,
      expectedRevenue: {
        weekly: 50, // 每份每周预期收益
        annualized: 2600, // 每份年化预期收益
      },
    };
  }, [currentRwaOrder]);

  // 判断当前用户是否是卖家
  const isSeller = useMemo(() => {
    if (!currentRwaOrder || !address) return false;
    return currentRwaOrder.seller.toLowerCase() === address.toLowerCase();
  }, [currentRwaOrder, address]);

  // 判断当前用户是否可以购买
  const canBuy = useMemo(() => {
    return isConnected && currentRwaOrder?.status === Erc3525OrderStatus.Active && !isSeller;
  }, [isConnected, currentRwaOrder?.status, isSeller]);

  // 订单状态文本
  const statusText = useMemo(() => {
    if (!currentRwaOrder) return '';
    const texts = {
      [Erc3525OrderStatus.Active]: t('otc.status.active') || '活跃',
      [Erc3525OrderStatus.Completed]: t('otc.status.completed') || '已成交',
      [Erc3525OrderStatus.Cancelled]: t('otc.status.cancelled') || '已取消',
    };
    return texts[currentRwaOrder.status];
  }, [currentRwaOrder, t]);

  // 计算预期收益
  const expectedRevenueForShares = useMemo(() => {
    if (!currentRwaOrder || !rwaMetadata) return null;
    return {
      weekly: rwaMetadata.expectedRevenue.weekly * currentRwaOrder.shares,
      annualized: rwaMetadata.expectedRevenue.annualized * currentRwaOrder.shares,
    };
  }, [currentRwaOrder, rwaMetadata]);

  // 执行购买
  const handleExecuteSwap = async () => {
    if (!currentRwaOrder || !canBuy) return;

    clearError();
    const result = await executeSwap(orderId);

    if (result?.success) {
      window.alert(t('otc.purchaseSuccess') || '购买成功！');
    }
  };

  // 取消订单
  const handleCancelOrder = async () => {
    if (!currentRwaOrder || !isSeller || currentRwaOrder.status !== Erc3525OrderStatus.Active)
      return;

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
  };

  if (isLoadingOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container size="lg" className="py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton variant="rectangular" className="aspect-video rounded-xl" />
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

  if (error || !currentRwaOrder) {
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
          {/* 左侧：项目信息和收益图表 */}
          <VStack gap="md" align="stretch">
            {/* 项目图片/图标 */}
            <div className="aspect-video bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <div className="text-center text-white">
                <span className="text-6xl">🎭</span>
                <h3 className="text-xl font-bold mt-4">{rwaMetadata?.projectName}</h3>
                <p className="text-sm opacity-80">ERC3525 Revenue Share</p>
              </div>
            </div>

            {/* 预期收益卡片 */}
            {expectedRevenueForShares && (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {t('otc.expectedRevenue') || '预期收益'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {t('otc.weeklyRevenue') || '周收益'}
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        ${expectedRevenueForShares.weekly.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {t('otc.annualizedRevenue') || '年化收益'}
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        ${expectedRevenueForShares.annualized.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * 基于历史数据估算，实际收益可能有所不同
                  </p>
                </CardContent>
              </Card>
            )}
          </VStack>

          {/* 右侧：订单信息 */}
          <VStack gap="lg" align="stretch">
            {/* 标题和状态 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                >
                  ERC3525
                </Badge>
                <Badge
                  variant={
                    currentRwaOrder.status === Erc3525OrderStatus.Active ? 'default' : 'outline'
                  }
                >
                  {statusText}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">
                {rwaMetadata?.name || `份额 #${currentRwaOrder.tokenId}`}
              </h1>
              {rwaMetadata?.description && (
                <p className="text-muted-foreground mt-2 text-sm">{rwaMetadata.description}</p>
              )}
            </div>

            {/* 份额和价格 */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('otc.shares') || '份额'}
                    </div>
                    <div className="text-2xl font-bold">
                      {currentRwaOrder.shares.toLocaleString()} 份
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('otc.totalPrice') || '总价'}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {currentRwaOrder.price.toLocaleString()} USDT
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground text-center border-t pt-3">
                  ≈ {(parseFloat(currentRwaOrder.price) / currentRwaOrder.shares).toFixed(2)} USDT /
                  份
                </div>
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
                  <span className="text-sm text-muted-foreground">RWA 合约</span>
                  <a
                    href={`${networkConfig.blockExplorerUrl}/address/${currentRwaOrder.rwaToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    {formatAddress(currentRwaOrder.rwaToken)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Token ID</span>
                  <span className="text-sm font-medium">#{currentRwaOrder.tokenId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('otc.seller') || '卖家'}</span>
                  <a
                    href={`${networkConfig.blockExplorerUrl}/address/${currentRwaOrder.seller}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    {formatAddress(currentRwaOrder.seller)}
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
              {currentRwaOrder.status === Erc3525OrderStatus.Active && (
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
                        t('otc.buyShares') || '购买份额'
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

              {currentRwaOrder.status === Erc3525OrderStatus.Completed && (
                <div className="text-center py-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    {t('otc.transactionCompleted') || '交易已完成'}
                  </p>
                </div>
              )}

              {currentRwaOrder.status === Erc3525OrderStatus.Cancelled && (
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
