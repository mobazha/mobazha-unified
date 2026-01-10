'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { Grid } from '@/components/layouts';
import { useI18n, useWallet, useUserStore } from '@mobazha/core';
import { Plus, ExternalLink, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import { getOtcConfig, getContractAddress } from '@mobazha/core/config/otcConfig';

// OTC 订单状态枚举
enum OtcOrderStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
}

// OTC 订单类型
interface OtcOrder {
  orderId: string;
  orderType: 'nft' | 'erc3525';
  title: string;
  image?: string;
  price: number;
  paymentToken: string;
  status: OtcOrderStatus;
  contractAddress: string;
  tokenId: number;
  createdAt: number;
}

interface OtcTabProps {
  peerId: string;
  isOwnStore: boolean;
}

// OTC 订单卡片组件
const OtcOrderCard: React.FC<{ order: OtcOrder }> = ({ order }) => {
  const { t } = useI18n();
  const networkConfig = getOtcConfig();
  
  const statusText = {
    [OtcOrderStatus.Active]: t('otc.status.active') || '活跃',
    [OtcOrderStatus.Completed]: t('otc.status.completed') || '已成交',
    [OtcOrderStatus.Cancelled]: t('otc.status.cancelled') || '已取消',
  };
  
  const statusVariant = {
    [OtcOrderStatus.Active]: 'default' as const,
    [OtcOrderStatus.Completed]: 'secondary' as const,
    [OtcOrderStatus.Cancelled]: 'outline' as const,
  };

  return (
    <Link href={`/otc/${order.orderType}/${order.orderId}`}>
      <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden">
        {/* 图片区域 */}
        <div className="aspect-square bg-muted relative overflow-hidden">
          {order.image ? (
            <img
              src={order.image}
              alt={order.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-4xl">
                {order.orderType === 'nft' ? '🎨' : '📊'}
              </span>
            </div>
          )}
          {/* 类型标签 */}
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 text-xs"
          >
            {order.orderType === 'nft' ? 'NFT' : 'ERC3525'}
          </Badge>
        </div>
        
        <CardContent className="p-3">
          <h3 className="font-medium text-sm truncate mb-1">{order.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-primary font-semibold text-sm">
              {order.price} USDT
            </span>
            <Badge variant={statusVariant[order.status]} className="text-xs">
              {statusText[order.status]}
            </Badge>
          </div>
          {/* 合约信息 */}
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">
              {order.contractAddress.slice(0, 6)}...{order.contractAddress.slice(-4)}
            </span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// OTC 订单卡片骨架屏
const OtcOrderCardSkeleton: React.FC = () => (
  <Card className="overflow-hidden">
    <Skeleton variant="rectangular" className="aspect-square" />
    <CardContent className="p-3 space-y-2">
      <Skeleton variant="text" className="h-4 w-3/4" />
      <div className="flex justify-between">
        <Skeleton variant="text" className="h-4 w-1/3" />
        <Skeleton variant="rounded" className="h-5 w-12" />
      </div>
    </CardContent>
  </Card>
);

export const OtcTab: React.FC<OtcTabProps> = ({ peerId, isOwnStore }) => {
  const { t } = useI18n();
  const { isConnected, walletInfo } = useWallet();
  const { isAuthenticated } = useUserStore();
  
  const [otcOrders, setOtcOrders] = useState<OtcOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取 OTC 订单列表
  const fetchOtcOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: 实际实现需要从链上或后端获取用户的 OTC 订单
      // 这里使用 mock 数据演示
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock 数据 - 仅在自己店铺或特定地址时显示
      const mockOrders: OtcOrder[] = isOwnStore ? [
        {
          orderId: '0x123abc',
          orderType: 'nft',
          title: 'KOL 限量签名照 #1',
          image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop',
          price: 100,
          paymentToken: 'USDT',
          status: OtcOrderStatus.Active,
          contractAddress: '0x17ebC8FeE90E7556E1E12Aa42604477D6A243324',
          tokenId: 1,
          createdAt: Date.now() - 86400000,
        },
        {
          orderId: '0x456def',
          orderType: 'erc3525',
          title: 'Starlight Dreams 份额',
          image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop',
          price: 500,
          paymentToken: 'USDT',
          status: OtcOrderStatus.Active,
          contractAddress: '0x4c1A1b21c4471CA57145EE08404Cbaf9C8B83991',
          tokenId: 1,
          createdAt: Date.now() - 172800000,
        },
        {
          orderId: '0x789ghi',
          orderType: 'nft',
          title: '演唱会纪念 NFT',
          price: 200,
          paymentToken: 'USDT',
          status: OtcOrderStatus.Completed,
          contractAddress: '0x17ebC8FeE90E7556E1E12Aa42604477D6A243324',
          tokenId: 2,
          createdAt: Date.now() - 259200000,
        },
      ] : [];
      
      setOtcOrders(mockOrders);
    } catch (err) {
      console.error('Failed to fetch OTC orders:', err);
      setError(t('otc.fetchError') || '获取 OTC 订单失败');
    } finally {
      setLoading(false);
    }
  }, [isOwnStore, t]);

  useEffect(() => {
    fetchOtcOrders();
  }, [fetchOtcOrders]);

  // 过滤活跃和历史订单
  const activeOrders = otcOrders.filter(o => o.status === OtcOrderStatus.Active);
  const historyOrders = otcOrders.filter(o => o.status !== OtcOrderStatus.Active);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton variant="text" className="h-6 w-32" />
          <Skeleton variant="rounded" className="h-9 w-32" />
        </div>
        <Grid cols={4} colsMobile={2} gap="md">
          {Array.from({ length: 4 }).map((_, i) => (
            <OtcOrderCardSkeleton key={i} />
          ))}
        </Grid>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部操作栏 - 仅自己店铺显示创建按钮 */}
      {isOwnStore && (
        <div className="flex flex-wrap gap-3 justify-end">
          <Link href="/otc/create/nft">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t('otc.createNft') || '创建 NFT 挂单'}
            </Button>
          </Link>
          <Link href="/otc/create/erc3525">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t('otc.createErc3525') || '创建份额挂单'}
            </Button>
          </Link>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
          {error}
          <Button
            variant="link"
            size="sm"
            className="ml-2 text-destructive"
            onClick={fetchOtcOrders}
          >
            {t('common.retry') || '重试'}
          </Button>
        </div>
      )}

      {/* 空状态 */}
      {otcOrders.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <span className="text-3xl">🔐</span>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {isOwnStore 
              ? (t('otc.noOtcYet') || '还没有 OTC 资产')
              : (t('otc.noOtcInStore') || '该店铺暂无 OTC 资产')
            }
          </h3>
          {isOwnStore && (
            <p className="text-muted-foreground text-sm mb-4">
              {t('otc.createFirstOtc') || '创建您的第一个 OTC 挂单，开始私密交易'}
            </p>
          )}
        </div>
      )}

      {/* 活跃订单 */}
      {activeOrders.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {t('otc.activeOrders') || '活跃挂单'}
            <Badge variant="secondary" className="ml-1">
              {activeOrders.length}
            </Badge>
          </h3>
          <Grid cols={4} colsMobile={2} gap="md">
            {activeOrders.map(order => (
              <OtcOrderCard key={order.orderId} order={order} />
            ))}
          </Grid>
        </div>
      )}

      {/* 历史订单 */}
      {historyOrders.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3 text-muted-foreground">
            {t('otc.historyOrders') || '历史记录'}
            <Badge variant="outline" className="ml-2">
              {historyOrders.length}
            </Badge>
          </h3>
          <Grid cols={4} colsMobile={2} gap="md">
            {historyOrders.map(order => (
              <OtcOrderCard key={order.orderId} order={order} />
            ))}
          </Grid>
        </div>
      )}
    </div>
  );
};

export default OtcTab;
