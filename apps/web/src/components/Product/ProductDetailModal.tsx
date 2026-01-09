'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductDetail } from './ProductDetail';

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

export function ProductDetailModal({ open, onOpenChange, slug, peerID }: ProductDetailModalProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>商品详情</DialogTitle>
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
