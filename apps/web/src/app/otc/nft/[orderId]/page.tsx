'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { useI18n, useWallet, useChatStore } from '@mobazha/core';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  MessageSquare,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { getOtcConfig } from '@mobazha/core/config/otcConfig';

// OTC 订单状态枚举
enum NftOrderStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
}

// NFT OTC 订单类型
interface NftOrder {
  orderId: string;
  seller: string;
  nftContract: string;
  tokenId: number;
  paymentToken: string;
  price: number;
  status: NftOrderStatus;
  createdAt: number;
  completedAt?: number;
}

// NFT 元数据
interface NftMetadata {
  name: string;
  description: string;
  image: string;
}

export default function NftOtcDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { t } = useI18n();
  const { isConnected, walletInfo, connect: connectWallet } = useWallet();
  const openChatDrawer = useChatStore(state => state.openDrawer);

  const networkConfig = getOtcConfig();

  const [order, setOrder] = useState<NftOrder | null>(null);
  const [nftMetadata, setNftMetadata] = useState<NftMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  // 获取订单详情
  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: 实际从链上获取订单信息
      // Mock 数据演示
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockOrder: NftOrder = {
        orderId,
        seller: '0xC4736E41D02faa7D735819AA9afa2ffee1Ce5931',
        nftContract: '0x17ebC8FeE90E7556E1E12Aa42604477D6A243324',
        tokenId: 1,
        paymentToken: networkConfig.contracts.USDT || '0x0000000000000000000000000000000000000000', // Mock USDT address
        price: 100,
        status: NftOrderStatus.Active,
        createdAt: Date.now() - 86400000,
      };

      setOrder(mockOrder);

      // Mock NFT 元数据
      setNftMetadata({
        name: 'KOL 限量签名照 #1',
        description: '某知名 KOL 的限量签名照，全球仅发行 100 份。持有此 NFT 可获得专属粉丝福利。',
        image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&h=600&fit=crop',
      });
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError(t('otc.fetchError') || '获取订单失败');
    } finally {
      setLoading(false);
    }
  }, [orderId, t, networkConfig.contracts.USDT]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // 判断当前用户是否是卖家
  const isSeller = useMemo(() => {
    if (!order || !walletInfo?.address) return false;
    return order.seller.toLowerCase() === walletInfo.address.toLowerCase();
  }, [order, walletInfo?.address]);

  // 判断当前用户是否可以购买
  const canBuy = useMemo(() => {
    return isConnected && order?.status === NftOrderStatus.Active && !isSeller;
  }, [isConnected, order?.status, isSeller]);

  // 订单状态文本
  const statusText = useMemo(() => {
    if (!order) return '';
    const texts = {
      [NftOrderStatus.Active]: t('otc.status.active') || '活跃',
      [NftOrderStatus.Completed]: t('otc.status.completed') || '已成交',
      [NftOrderStatus.Cancelled]: t('otc.status.cancelled') || '已取消',
    };
    return texts[order.status];
  }, [order, t]);

  // 执行购买
  const handleExecuteSwap = async () => {
    if (!order || !canBuy) return;

    setExecuting(true);
    try {
      // TODO: 实际调用合约执行交换
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 刷新订单状态
      await fetchOrder();

      window.alert(t('otc.purchaseSuccess') || '购买成功！');
    } catch (err) {
      console.error('Failed to execute swap:', err);
      window.alert(t('otc.purchaseFailed') || '购买失败');
    } finally {
      setExecuting(false);
    }
  };

  // 取消订单
  const handleCancelOrder = async () => {
    if (!order || !isSeller || order.status !== NftOrderStatus.Active) return;

    if (!window.confirm(t('otc.confirmCancel') || '确定要取消此订单吗？')) return;

    setCancelling(true);
    try {
      // TODO: 实际调用合约取消订单
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 刷新订单状态
      await fetchOrder();

      window.alert(t('otc.cancelSuccess') || '订单已取消');
    } catch (err) {
      console.error('Failed to cancel order:', err);
      window.alert(t('otc.cancelFailed') || '取消失败');
    } finally {
      setCancelling(false);
    }
  };

  // 复制链接
  const copyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 格式化地址
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 打开聊天
  const handleOpenChat = () => {
    openChatDrawer();
    // TODO: 自动选择与卖家的对话
  };

  if (loading) {
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

  if (error || !order) {
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
                <Badge variant={order.status === NftOrderStatus.Active ? 'default' : 'outline'}>
                  {statusText}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">{nftMetadata?.name || `NFT #${order.tokenId}`}</h1>
              {nftMetadata?.description && (
                <p className="text-muted-foreground mt-2">{nftMetadata.description}</p>
              )}
            </div>

            {/* 价格 */}
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">{t('otc.price') || '价格'}</div>
                <div className="text-3xl font-bold text-primary">{order.price} USDT</div>
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
                    href={`${networkConfig.blockExplorerUrl}/address/${order.nftContract}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    {formatAddress(order.nftContract)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Token ID</span>
                  <span className="text-sm font-medium">#{order.tokenId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('otc.seller') || '卖家'}</span>
                  <a
                    href={`${networkConfig.blockExplorerUrl}/address/${order.seller}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    {formatAddress(order.seller)}
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

            {/* 操作按钮 */}
            <VStack gap="sm">
              {order.status === NftOrderStatus.Active && (
                <>
                  {!isConnected ? (
                    <Button className="w-full" size="lg" onClick={connectWallet}>
                      {t('wallet.connect') || '连接钱包'}
                    </Button>
                  ) : canBuy ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleExecuteSwap}
                      disabled={executing}
                    >
                      {executing ? (
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
                      disabled={cancelling}
                    >
                      {cancelling ? (
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

              {order.status === NftOrderStatus.Completed && (
                <div className="text-center py-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    {t('otc.transactionCompleted') || '交易已完成'}
                  </p>
                </div>
              )}

              {order.status === NftOrderStatus.Cancelled && (
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
