'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { ProductDetail, ProductBottomBar } from '@/components/Product';
import { productDataService } from '@mobazha/core';
import type { Product } from '@mobazha/core';

// 获取库存数量（从 SKU 计算）
function getStockQuantity(product: Product): number {
  if (!product.item.skus || product.item.skus.length === 0) {
    return 999; // 默认无限库存
  }
  return product.item.skus.reduce((sum, sku) => sum + (sku.quantity || 0), 0);
}

export default function ProductPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const peerID = searchParams.get('peerID') || undefined;

  // 状态管理 - 用于底部操作栏
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, _setQuantity] = useState(1);
  const [isWishlist, setIsWishlist] = useState(false);
  void _setQuantity; // Reserved for future use - quantity control in bottom bar

  // 获取商品数据（用于底部栏）
  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      try {
        const productData = await productDataService.getProduct(slug, peerID);
        setProduct(productData);
      } catch (err) {
        console.error('Failed to fetch product for bottom bar:', err);
      }
    };
    fetchProduct();
  }, [slug, peerID]);

  // 计算库存
  const stock = useMemo(() => {
    if (!product) return 0;
    return getStockQuantity(product);
  }, [product]);

  // 切换收藏
  const handleToggleWishlist = useCallback(() => {
    setIsWishlist(prev => !prev);
    // TODO: 实际的收藏 API 调用
  }, []);

  // 跳转到消息
  const handleMessage = useCallback(() => {
    if (product?.vendorID?.peerID) {
      router.push(`/chat/${product.vendorID.peerID}`);
    }
  }, [product, router]);

  // 跳转到购物车
  const handleCart = useCallback(() => {
    router.push('/cart');
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          <ProductDetail
            slug={slug}
            peerID={peerID}
            isModal={false}
            onMessage={handleMessage}
            onCart={handleCart}
          />
        </Container>
      </main>

      {/* 移动端底部操作栏 */}
      <ProductBottomBar
        product={product}
        quantity={quantity}
        stock={stock}
        isWishlist={isWishlist}
        onToggleWishlist={handleToggleWishlist}
      />

      <Footer />
    </div>
  );
}
