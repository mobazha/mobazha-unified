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
const MIN_CONNECTING_DISPLAY_TIME = 800;

interface VendorInfo {
  name?: string;
  avatar?: string;
}

export function ProductDetailModal({ open, onOpenChange, slug, peerID }: ProductDetailModalProps) {
  // 连接状态
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed'>(
    'connecting'
  );
  const [vendorInfo, setVendorInfo] = useState<VendorInfo>({});
  const [productTitle, setProductTitle] = useState<string | undefined>();

  // 用于取消请求的 abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // 当弹框打开时，开始预取数据
  useEffect(() => {
    // 弹框关闭时重置状态 - 这是标准的清理模式
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConnectionState('connecting');

      setVendorInfo({});

      setProductTitle(undefined);
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    // 创建新的 abort controller
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const startTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // 如果有 peerID，立即开始获取卖家信息（不等待商品数据）
    if (peerID) {
      profileApi
        .getProfile(peerID)
        .then(vendor => {
          if (vendor && !signal.aborted) {
            setVendorInfo({
              name: vendor.name,
              avatar: vendor.avatarHashes?.small
                ? getImageUrl(vendor.avatarHashes.small)
                : undefined,
            });
          }
        })
        .catch(() => {
          // 忽略卖家信息获取失败
        });
    }

    const fetchData = async () => {
      try {
        console.log('[ConnectingModal] Starting to fetch product:', slug, peerID);

        // 设置超时
        timeoutId = setTimeout(() => {
          if (!signal.aborted) {
            console.log('[ConnectingModal] Connection timeout');
            setConnectionState('failed');
          }
        }, CONNECTION_TIMEOUT);

        // 获取商品数据
        const product = await productDataService.getProduct(slug, peerID);

        console.log('[ConnectingModal] Product fetched:', product ? 'success' : 'null');

        if (signal.aborted) {
          console.log('[ConnectingModal] Request was aborted');
          return;
        }

        if (!product) {
          console.log('[ConnectingModal] No product found, setting failed');
          if (timeoutId) clearTimeout(timeoutId);
          setConnectionState('failed');
          return;
        }

        setProductTitle(product.item?.title);

        // 如果之前没有 peerID，现在从商品数据获取卖家信息
        if (!peerID && product.vendorID?.peerID) {
          profileApi
            .getProfile(product.vendorID.peerID)
            .then(vendor => {
              if (vendor && !signal.aborted) {
                setVendorInfo({
                  name: vendor.name,
                  avatar: vendor.avatarHashes?.small
                    ? getImageUrl(vendor.avatarHashes.small)
                    : undefined,
                });
              }
            })
            .catch(() => {
              // 忽略卖家信息获取失败
            });
        }

        // 确保连接弹框至少显示一定时间
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_CONNECTING_DISPLAY_TIME - elapsed);

        console.log('[ConnectingModal] Will show connected state in', remainingTime, 'ms');

        setTimeout(() => {
          if (!signal.aborted) {
            if (timeoutId) clearTimeout(timeoutId);
            console.log('[ConnectingModal] Setting connected state');
            setConnectionState('connected');
          }
        }, remainingTime);
      } catch (error) {
        console.error('[ConnectingModal] Failed to fetch product data:', error);
        if (timeoutId) clearTimeout(timeoutId);
        if (!signal.aborted) {
          setConnectionState('failed');
        }
      }
    };

    fetchData();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [open, slug, peerID]);

  // 重试连接
  const handleRetry = useCallback(() => {
    setConnectionState('connecting');

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 abort controller
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const fetchData = async () => {
      try {
        const product = await productDataService.getProduct(slug, peerID);

        if (signal.aborted) return;

        if (product) {
          setProductTitle(product.item?.title);

          const vendorPeerID = peerID || product.vendorID?.peerID;
          if (vendorPeerID) {
            const vendor = await profileApi.getProfile(vendorPeerID).catch(() => null);
            if (vendor && !signal.aborted) {
              setVendorInfo({
                name: vendor.name,
                avatar: vendor.avatarHashes?.small
                  ? getImageUrl(vendor.avatarHashes.small)
                  : undefined,
              });
            }
          }

          setConnectionState('connected');
        } else {
          setConnectionState('failed');
        }
      } catch {
        if (!signal.aborted) {
          setConnectionState('failed');
        }
      }
    };

    fetchData();
  }, [slug, peerID]);

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
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>
        {/* 关闭按钮 - 放在右上角，与商家栏分开 */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-[60] w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-muted border border-border/50 shadow-sm transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-4 h-4 text-foreground"
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
        <div className="overflow-y-auto max-h-[calc(90vh-1rem)] scroll-smooth">
          <ProductDetail slug={slug} peerID={peerID} isModal={true} onClose={handleClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
