'use client';

import React, { useState, useCallback, createContext, useContext, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ProductDetailModal } from '@/components/Product';

interface ProductModalState {
  isOpen: boolean;
  slug: string | null;
  peerID: string | null;
}

interface ProductModalContextValue {
  /** 打开商品详情弹框（桌面端）或导航到商品页面（移动端） */
  openProduct: (slug: string, peerID?: string) => void;
  /** 关闭商品详情弹框 */
  closeProduct: () => void;
  /** 是否为移动端 */
  isMobile: boolean;
  /** 弹框状态 */
  modalState: ProductModalState;
}

const ProductModalContext = createContext<ProductModalContextValue | null>(null);

// 断点常量
const MOBILE_BREAKPOINT = 1024; // lg 断点

export function ProductModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 响应式状态
  const [isMobile, setIsMobile] = useState(true); // 默认为移动端，避免服务端渲染问题

  // 检测窗口尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // 初始检测
    checkMobile();

    // 监听窗口变化
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 从 URL 参数计算弹框状态（直接使用派生状态，避免额外的 state 同步）
  const productSlug = searchParams.get('product');
  const productPeerID = searchParams.get('peerID');

  // 计算弹框状态（基于 URL 参数和设备类型）
  // 直接使用 useMemo 的结果作为 modalState，避免使用 useEffect 同步导致的额外渲染
  const modalState: ProductModalState = useMemo(() => {
    if (isMobile) {
      // 移动端不使用弹框
      return { isOpen: false, slug: null, peerID: null };
    }

    if (productSlug) {
      return {
        isOpen: true,
        slug: productSlug,
        peerID: productPeerID,
      };
    }

    return {
      isOpen: false,
      slug: null,
      peerID: null,
    };
  }, [productSlug, productPeerID, isMobile]);

  // 打开商品详情
  const openProduct = useCallback(
    (slug: string, peerID?: string) => {
      // 实时检测窗口尺寸，避免依赖可能过时的 isMobile 状态
      const isCurrentlyMobile =
        typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;

      if (isCurrentlyMobile) {
        // 移动端：导航到商品详情页面
        const url = peerID ? `/product/${slug}?peerID=${peerID}` : `/product/${slug}`;
        router.push(url);
      } else {
        // 桌面端：打开弹框，同时更新 URL
        const params = new URLSearchParams(searchParams.toString());
        params.set('product', slug);
        if (peerID) {
          params.set('peerID', peerID);
        } else {
          params.delete('peerID');
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    },
    [router, pathname, searchParams]
  );

  // 关闭商品详情
  const closeProduct = useCallback(() => {
    // 实时检测窗口尺寸，与 openProduct 保持一致，避免依赖可能过时的 isMobile 状态
    const isCurrentlyMobile =
      typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;

    if (!isCurrentlyMobile) {
      // 桌面端：关闭弹框，移除 URL 参数
      const params = new URLSearchParams(searchParams.toString());
      params.delete('product');
      params.delete('peerID');
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.push(newUrl, { scroll: false });
    }
  }, [router, pathname, searchParams]);

  // 处理弹框关闭
  const handleModalOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeProduct();
      }
    },
    [closeProduct]
  );

  return (
    <ProductModalContext.Provider
      value={{
        openProduct,
        closeProduct,
        isMobile,
        modalState,
      }}
    >
      {children}

      {/* 桌面端商品详情弹框 */}
      {!isMobile && modalState.slug && (
        <ProductDetailModal
          open={modalState.isOpen}
          onOpenChange={handleModalOpenChange}
          slug={modalState.slug}
          peerID={modalState.peerID || undefined}
        />
      )}
    </ProductModalContext.Provider>
  );
}

export function useProductModal() {
  const context = useContext(ProductModalContext);
  if (!context) {
    throw new Error('useProductModal must be used within a ProductModalProvider');
  }
  return context;
}
