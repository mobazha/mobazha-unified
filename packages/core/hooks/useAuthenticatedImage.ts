'use client';

import { useState, useEffect, useRef } from 'react';
import { matrixClient } from '../services/matrix';

// 全局图片缓存
const imageCache = new Map<string, string>();

/**
 * Hook 用于加载需要认证的 Matrix 图片
 * @param mxcUrl - mxc:// URL 或已转换的认证 URL
 * @param fallbackUrl - 如果认证加载失败时使用的 fallback URL
 */
export function useAuthenticatedImage(
  mxcUrl: string | undefined | null,
  fallbackUrl?: string
): {
  imageUrl: string | null;
  loading: boolean;
  error: boolean;
} {
  const [imageUrl, setImageUrl] = useState<string | null>(() => {
    // 检查缓存
    if (mxcUrl && imageCache.has(mxcUrl)) {
      return imageCache.get(mxcUrl) || null;
    }
    return fallbackUrl || null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // 如果没有 mxc URL，使用 fallback
    if (!mxcUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始化状态需要在 effect 中设置
      setImageUrl(fallbackUrl || null);
      setLoading(false);
      setError(false);
      return;
    }

    // 检查缓存
    if (imageCache.has(mxcUrl)) {
      setImageUrl(imageCache.get(mxcUrl) || null);
      setLoading(false);
      setError(false);
      return;
    }

    // 如果已经加载过这个 URL，跳过
    if (loadedUrlRef.current === mxcUrl && imageUrl) {
      return;
    }

    let mounted = true;

    const loadImage = async () => {
      setLoading(true);
      setError(false);

      try {
        // 使用 matrixClient 的认证下载方法
        const blobUrl = await matrixClient.downloadAuthenticatedImage(mxcUrl);

        if (mounted) {
          if (blobUrl) {
            imageCache.set(mxcUrl, blobUrl);
            loadedUrlRef.current = mxcUrl;
            setImageUrl(blobUrl);
            setError(false);
          } else {
            // 认证下载失败，使用 fallback
            setImageUrl(fallbackUrl || null);
            setError(true);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.warn('[useAuthenticatedImage] Failed to load:', mxcUrl, err);
          setImageUrl(fallbackUrl || null);
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [mxcUrl, fallbackUrl, imageUrl]);

  return { imageUrl, loading, error };
}

/**
 * 清除图片缓存
 */
export function clearImageCache(): void {
  // 释放所有 blob URLs
  imageCache.forEach(blobUrl => {
    if (blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  });
  imageCache.clear();
}
