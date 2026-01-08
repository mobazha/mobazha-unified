/**
 * 图片上传 API 服务
 */

import { post } from './client';
import { getGatewayUrl, getAuthHeaders } from './config';
import type { Image } from '../../types';

interface ImageUploadData {
  filename: string;
  image: string; // base64 encoded image data
}

/**
 * 上传商品图片
 * @param images - 图片数据数组
 * @returns 上传后的图片哈希数组
 */
export async function uploadProductImages(
  images: ImageUploadData[],
  username?: string,
  password?: string
): Promise<Image[]> {
  const url = `${getGatewayUrl()}/ob/productimages`;
  try {
    const result = await post<Image[]>(url, images, getAuthHeaders(username, password));
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
export async function uploadImage(
  imageData: ImageUploadData,
  username?: string,
  password?: string
): Promise<Image | null> {
  const url = `${getGatewayUrl()}/ob/images`;
  try {
    const result = await post<Image[]>(url, [imageData], getAuthHeaders(username, password));
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
export async function uploadAvatarImage(
  file: File,
  username?: string,
  password?: string
): Promise<Image | null> {
  const base64 = await fileToBase64(file);
  return uploadImage(
    {
      filename: 'avatarImage',
      image: base64,
    },
    username,
    password
  );
}

/**
 * 上传封面图片
 * @param file - 文件对象
 * @returns 上传后的图片哈希
 */
export async function uploadHeaderImage(
  file: File,
  username?: string,
  password?: string
): Promise<Image | null> {
  const base64 = await fileToBase64(file);
  return uploadImage(
    {
      filename: 'headerImage',
      image: base64,
    },
    username,
    password
  );
}
