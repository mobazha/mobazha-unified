/**
 * 图片上传 API 服务
 */

import type { Image } from '../../types';
import { NODE_API } from '../../config/apiPaths';
import { authPost } from './helpers';

interface ImageUploadData {
  filename: string;
  image: string; // base64 encoded image data
}

/** POST /v1/media/images returns a single CID per file (no variant resize). */
type MediaFileHashResponse = {
  name?: string;
  hash: string;
};

/**
 * Normalize upload responses: generic /media/images returns { hash, name };
 * product-images and profile slots return full Image { tiny, small, ... }.
 */
export function imageFromUploadResponse(item: Image | MediaFileHashResponse): Image | null {
  if ('hash' in item && typeof item.hash === 'string' && item.hash.length > 0) {
    const h = item.hash;
    return {
      tiny: h,
      small: h,
      medium: h,
      large: h,
      original: h,
      filename: item.name,
    };
  }
  if ('small' in item && item.small) {
    return item as Image;
  }
  return null;
}

const MAX_IMAGE_DIMENSION = 2048;

/**
 * 上传商品图片
 * @param images - 图片数据数组
 * @returns 上传后的图片哈希数组
 */
export async function uploadProductImages(images: ImageUploadData[]): Promise<Image[]> {
  try {
    const result = await authPost<Image[]>(NODE_API.MEDIA_PRODUCT_IMAGES, images);
    return result || [];
  } catch {
    return [];
  }
}

/**
 * 上传单张图片（用于头像、封面等）
 * @param imageData - 图片数据
 * @returns 上传后的图片哈希
 */
export async function uploadImage(imageData: ImageUploadData): Promise<Image | null> {
  try {
    const result = await authPost<Array<Image | MediaFileHashResponse>>(NODE_API.MEDIA_IMAGES, [
      imageData,
    ]);
    const first = result?.[0];
    return first ? imageFromUploadResponse(first) : null;
  } catch {
    return null;
  }
}

/**
 * Conditionally resize an image file if either dimension exceeds MAX_IMAGE_DIMENSION.
 * Uses canvas to scale down while preserving aspect ratio and original format.
 * Skipped for GIF (animated frames) and SVG (vector). Non-image files pass through.
 */
const SKIP_RESIZE_TYPES = new Set(['image/gif', 'image/svg+xml']);

function resizeIfNeeded(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || SKIP_RESIZE_TYPES.has(file.type)) {
    return Promise.resolve(file);
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= MAX_IMAGE_DIMENSION && h <= MAX_IMAGE_DIMENSION) {
        resolve(file);
        return;
      }

      const scale = Math.min(MAX_IMAGE_DIMENSION / w, MAX_IMAGE_DIMENSION / h);
      const newW = Math.round(w * scale);
      const newH = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, newW, newH);

      const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
      const outputType = hasAlpha ? file.type : 'image/jpeg';
      const quality = outputType === 'image/jpeg' ? 0.92 : 0.9;

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resize'));
    };

    img.src = url;
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 将 File 对象转换为 base64。
 * 图片文件如果尺寸超过 2048px 会先等比缩放再编码，非图片文件直接编码。
 */
export async function fileToBase64(file: File): Promise<string> {
  const blob = await resizeIfNeeded(file);
  return blobToBase64(blob);
}

/**
 * 上传头像图片
 * @param file - 文件对象
 * @returns 上传后的图片哈希
 */
export async function uploadAvatarImage(file: File): Promise<Image | null> {
  const base64 = await fileToBase64(file);
  return uploadImage({
    filename: 'avatarImage',
    image: base64,
  });
}

/**
 * 上传封面图片（通用端点）
 * @param file - 文件对象
 * @returns 上传后的图片哈希
 */
export async function uploadHeaderImage(file: File): Promise<Image | null> {
  const base64 = await fileToBase64(file);
  return uploadImage({
    filename: 'headerImage',
    image: base64,
  });
}

/**
 * 上传头像（专用端点）
 *
 * 使用 POST /v1/media/avatar，后端调用 SetAvatarImage 进行服务端裁切，
 * 生成多尺寸（tiny/small/medium/large/original）并自动关联到当前用户 profile。
 * 请求格式：{ avatar: base64 }（与 desktop 一致）
 */
export async function uploadAvatar(file: File): Promise<Image | null> {
  try {
    const base64 = await fileToBase64(file);
    return await authPost<Image>(NODE_API.MEDIA_AVATAR, { avatar: base64 });
  } catch {
    return null;
  }
}

/**
 * 上传店铺封面（专用端点）
 *
 * 使用 POST /v1/media/header，后端调用 SetHeaderImage 进行服务端裁切，
 * 生成多尺寸并自动关联到当前用户 profile。
 * 请求格式：{ header: base64 }
 */
export async function uploadHeader(file: File): Promise<Image | null> {
  try {
    const base64 = await fileToBase64(file);
    return await authPost<Image>(NODE_API.MEDIA_HEADER, { header: base64 });
  } catch {
    return null;
  }
}
