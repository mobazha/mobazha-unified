'use client';

import { useState, useEffect, useRef } from 'react';
import { matrixClient } from '../services/matrix';

// 全局图片缓存
const imageCache = new Map<string, string>();

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

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
    if (mxcUrl && imageCache.has(mxcUrl)) {
      return imageCache.get(mxcUrl) || null;
    }
    return fallbackUrl || null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadedUrlRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!mxcUrl) {
      setImageUrl(fallbackUrl || null);
      setLoading(false);
      setError(false);
      retryCountRef.current = 0;
      return;
    }

    if (imageCache.has(mxcUrl)) {
      setImageUrl(imageCache.get(mxcUrl) || null);
      setLoading(false);
      setError(false);
      return;
    }

    if (loadedUrlRef.current === mxcUrl && imageUrl) {
      return;
    }

    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const loadImage = async () => {
      if (!mounted) return;
      setLoading(true);
      setError(false);

      try {
        const blobUrl = await matrixClient.downloadAuthenticatedImage(mxcUrl);

        if (!mounted) return;

        if (blobUrl) {
          imageCache.set(mxcUrl, blobUrl);
          loadedUrlRef.current = mxcUrl;
          retryCountRef.current = 0;
          setImageUrl(blobUrl);
          setError(false);
          setLoading(false);
        } else if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          setLoading(false);
          retryTimer = setTimeout(() => {
            if (mounted) loadImage();
          }, RETRY_DELAY_MS * retryCountRef.current);
        } else {
          setImageUrl(fallbackUrl || null);
          setError(true);
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

    retryCountRef.current = 0;
    loadImage();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retry is internal, only re-run when mxcUrl/fallback change
  }, [mxcUrl, fallbackUrl]);

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
