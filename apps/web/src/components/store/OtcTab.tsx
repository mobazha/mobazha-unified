'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton-compat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Grid, HStack } from '@/components/layouts';
import { useI18n, useWallet, useUserStore } from '@mobazha/core';
import { Plus, ExternalLink, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

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
              <span className="text-4xl">{order.orderType === 'nft' ? '🎨' : '📊'}</span>
            </div>
          )}
          {/* 类型标签 */}
          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
            {order.orderType === 'nft' ? 'NFT' : 'ERC3525'}
          </Badge>
        </div>

        <CardContent className="p-3">
          <h3 className="font-medium text-sm truncate mb-1">{order.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-primary font-semibold text-sm">{order.price} USDT</span>
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

// OTC 筛选类型
type OtcStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';
type OtcTypeFilter = 'all' | 'nft' | 'erc3525';
type OtcSortOption = 'newest' | 'price-asc' | 'price-desc';

export const OtcTab: React.FC<OtcTabProps> = ({ peerId, isOwnStore }) => {
  const { t } = useI18n();
  const { isConnected, walletInfo } = useWallet();
  const { isAuthenticated } = useUserStore();

  const [otcOrders, setOtcOrders] = useState<OtcOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<OtcStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<OtcTypeFilter>('all');
  const [sortBy, setSortBy] = useState<OtcSortOption>('newest');

  // 获取 OTC 订单列表
  const fetchOtcOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: 实际实现需要从链上或后端获取用户的 OTC 订单
      // 这里使用 mock 数据演示
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock 数据 - 仅在自己店铺或特定地址时显示
      const mockOrders: OtcOrder[] = isOwnStore
        ? [
            {
              orderId: '0x123abc',
              orderType: 'nft',
              title: 'KOL 限量签名照 #1',
              image:
                'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop',
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
              image:
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop',
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
              image:
                'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=400&fit=crop',
              price: 200,
              paymentToken: 'USDT',
              status: OtcOrderStatus.Completed,
              contractAddress: '0x17ebC8FeE90E7556E1E12Aa42604477D6A243324',
              tokenId: 2,
              createdAt: Date.now() - 259200000,
            },
          ]
        : [];

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

  // 筛选和排序后的订单列表
  const filteredOrders = useMemo(() => {
    let result = [...otcOrders];

    // 状态筛选
    if (statusFilter !== 'all') {
      const statusMap: Record<OtcStatusFilter, OtcOrderStatus | undefined> = {
        all: undefined,
        active: OtcOrderStatus.Active,
        completed: OtcOrderStatus.Completed,
        cancelled: OtcOrderStatus.Cancelled,
      };
      const targetStatus = statusMap[statusFilter];
      if (targetStatus !== undefined) {
        result = result.filter(o => o.status === targetStatus);
      }
    }

    // 类型筛选
    if (typeFilter !== 'all') {
      result = result.filter(o => o.orderType === typeFilter);
    }

    // 排序
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return result;
  }, [otcOrders, statusFilter, typeFilter, sortBy]);

  // 活跃和历史订单（用于分组显示）
  const activeOrders = filteredOrders.filter(o => o.status === OtcOrderStatus.Active);
  const historyOrders = filteredOrders.filter(o => o.status !== OtcOrderStatus.Active);

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

  // 是否有筛选条件
  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        {/* 筛选器 - 仅当有订单时显示 */}
        {otcOrders.length > 0 && (
          <HStack gap="sm" className="flex-wrap">
            {/* 状态筛选 */}
            <Select
              value={statusFilter}
              onValueChange={(value: OtcStatusFilter) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder={t('otc.filterStatus') || '状态'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTypes') || '全部'}</SelectItem>
                <SelectItem value="active">{t('otc.status.active') || '活跃'}</SelectItem>
                <SelectItem value="completed">{t('otc.status.completed') || '已成交'}</SelectItem>
                <SelectItem value="cancelled">{t('otc.status.cancelled') || '已取消'}</SelectItem>
              </SelectContent>
            </Select>

            {/* 类型筛选 */}
            <Select
              value={typeFilter}
              onValueChange={(value: OtcTypeFilter) => setTypeFilter(value)}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder={t('otc.filterType') || '类型'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTypes') || '全部'}</SelectItem>
                <SelectItem value="nft">NFT</SelectItem>
                <SelectItem value="erc3525">ERC3525</SelectItem>
              </SelectContent>
            </Select>

            {/* 排序 */}
            <Select value={sortBy} onValueChange={(value: OtcSortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder={t('search.sortBy') || '排序'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('search.newest') || '最新'}</SelectItem>
                <SelectItem value="price-asc">
                  {t('search.priceLowHigh') || '价格从低到高'}
                </SelectItem>
                <SelectItem value="price-desc">
                  {t('search.priceHighLow') || '价格从高到低'}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* 结果数量 */}
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {filteredOrders.length} {t('otc.items') || '项'}
            </span>
          </HStack>
        )}

        {/* 创建按钮 - 仅自己店铺显示 */}
        {isOwnStore && (
          <HStack gap="sm" className="flex-shrink-0">
            <Link href="/otc/create/nft">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('otc.createNft') || '创建 NFT 挂单'}</span>
                <span className="sm:hidden">NFT</span>
              </Button>
            </Link>
            <Link href="/otc/create/erc3525">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('otc.createErc3525') || '创建份额挂单'}</span>
                <span className="sm:hidden">ERC3525</span>
              </Button>
            </Link>
          </HStack>
        )}
      </div>

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

      {/* 空状态 - 原始数据为空 */}
      {otcOrders.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <span className="text-3xl">🔐</span>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {isOwnStore
              ? t('otc.noOtcYet') || '还没有 OTC 资产'
              : t('otc.noOtcInStore') || '该店铺暂无 OTC 资产'}
          </h3>
          {isOwnStore && (
            <p className="text-muted-foreground text-sm mb-4">
              {t('otc.createFirstOtc') || '创建您的第一个 OTC 挂单，开始私密交易'}
            </p>
          )}
        </div>
      )}

      {/* 空状态 - 筛选后无结果 */}
      {otcOrders.length > 0 && filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-2">
            {t('empty.noProductsFound') || '未找到匹配项'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('empty.tryAdjustingFilters') || '尝试调整筛选条件'}
          </p>
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
