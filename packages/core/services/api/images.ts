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
    const result = await authPost<Image[]>(NODE_API.MEDIA_IMAGES, [imageData]);
    return result?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * 将 File 对象转换为 base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
 * 上传封面图片
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
