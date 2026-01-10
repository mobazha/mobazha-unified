'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductDetail } from './ProductDetail';
import { ConnectingModal } from './ConnectingModal';
import { productDataService, profileApi, getImageUrl } from '@mobazha/core';

export interface ProductDetailModalProps {
  /** 是否打开弹框 */
  open: boolean;
  /** 关闭弹框回调 */
  onOpenChange: (open: boolean) => void;
  /** 商品 slug */
  slug: string;
  /** 卖家 peerID */
  peerID?: string;
}

// 连接超时时间（毫秒）
const CONNECTION_TIMEOUT = 30000;
// 显示连接弹框的最小延迟时间（毫秒）
const MIN_CONNECTING_DISPLAY_TIME = 500;

interface VendorInfo {
  name?: string;
  avatar?: string;
}

export function ProductDetailModal({ open, onOpenChange, slug, peerID }: ProductDetailModalProps) {
  // 连接状态
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [vendorInfo, setVendorInfo] = useState<VendorInfo>({});
  const [productTitle, setProductTitle] = useState<string | undefined>();
  
  // 用于跟踪组件是否已卸载
  const isMountedRef = useRef(true);
  // 用于跟踪当前加载的请求
  const currentRequestRef = useRef<string | null>(null);
  // 连接开始时间
  const connectionStartTimeRef = useRef<number>(0);
  
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // 核心数据获取逻辑
  const fetchProductAndVendor = useCallback(async (
    onSuccess: () => void,
    onFail: () => void,
  ) => {
    try {
      // 获取商品数据
      const product = await productDataService.getProduct(slug, peerID);
      
      if (!isMountedRef.current) return;

      if (!product) {
        onFail();
        return;
      }

      setProductTitle(product.item?.title);
      
      // 获取卖家信息
      const vendorPeerID = peerID || product.vendorID?.peerID;
      if (vendorPeerID) {
        const vendor = await profileApi.getProfile(vendorPeerID).catch(() => null);
        if (vendor && isMountedRef.current) {
          setVendorInfo({
            name: vendor.name,
            avatar: vendor.avatarHashes?.small 
              ? getImageUrl(vendor.avatarHashes.small) 
              : undefined,
          });
        }
      }
      
      onSuccess();
    } catch (error) {
      console.error('Failed to fetch product data:', error);
      if (isMountedRef.current) {
        onFail();
      }
    }
  }, [slug, peerID]);

  // 当弹框打开时，开始预取数据
  useEffect(() => {
    if (!open) {
      // 重置状态
      setConnectionState('connecting');
      setVendorInfo({});
      setProductTitle(undefined);
      currentRequestRef.current = null;
      return;
    }

    const requestKey = `${slug}-${peerID || ''}`;
    
    // 防止重复请求
    if (currentRequestRef.current === requestKey) {
      return;
    }
    
    currentRequestRef.current = requestKey;
    isMountedRef.current = true;
    connectionStartTimeRef.current = Date.now();
    setConnectionState('connecting');

    let timeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    // 设置超时
    timeoutId = setTimeout(() => {
      if (!isCancelled && isMountedRef.current) {
        setConnectionState('failed');
      }
    }, CONNECTION_TIMEOUT);

    fetchProductAndVendor(
      // onSuccess
      () => {
        if (isCancelled || !isMountedRef.current) return;
        
        // 确保连接弹框至少显示一定时间，避免闪烁
        const elapsed = Date.now() - connectionStartTimeRef.current;
        const remainingTime = Math.max(0, MIN_CONNECTING_DISPLAY_TIME - elapsed);
        
        setTimeout(() => {
          if (!isCancelled && isMountedRef.current) {
            if (timeoutId) clearTimeout(timeoutId);
            setConnectionState('connected');
          }
        }, remainingTime);
      },
      // onFail
      () => {
        if (!isCancelled && isMountedRef.current) {
          setConnectionState('failed');
        }
      }
    );

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open, slug, peerID, fetchProductAndVendor]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 重试连接
  const handleRetry = useCallback(() => {
    currentRequestRef.current = `${slug}-${peerID || ''}-retry-${Date.now()}`;
    setConnectionState('connecting');
    connectionStartTimeRef.current = Date.now();
    
    fetchProductAndVendor(
      () => setConnectionState('connected'),
      () => setConnectionState('failed')
    );
  }, [slug, peerID, fetchProductAndVendor]);

  // 连接中或失败状态显示连接弹框
  if (connectionState !== 'connected') {
    return (
      <ConnectingModal
        open={open}
        onClose={handleClose}
        vendorName={vendorInfo.name}
        vendorAvatar={vendorInfo.avatar}
        productTitle={productTitle}
        isFailed={connectionState === 'failed'}
        onRetry={handleRetry}
      />
    );
  }

  // 连接成功后显示商品详情
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-50 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* 商品详情内容 */}
        <div className="overflow-y-auto max-h-[calc(90vh-2rem)]">
          <ProductDetail slug={slug} peerID={peerID} isModal={true} onClose={handleClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
