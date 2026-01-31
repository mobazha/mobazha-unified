/**
 * useShippingAddresses hook
 * 管理用户的收货地址
 */

import { useState, useCallback, useEffect } from 'react';
import { profileApi } from '../services/api';
import type { Address } from '../types/common';

/**
 * 前端展示用的地址类型（带 id）
 */
export interface DisplayAddress extends Address {
  id: string;
  phone?: string;
  isDefault?: boolean;
}

/**
 * UI 展示用的精简地址格式
 * 用于列表渲染等场景
 */
export interface DisplayAddressUI {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

/**
 * 将 DisplayAddress 转换为 UI 展示格式
 */
export function toDisplayAddressUI(addr: DisplayAddress): DisplayAddressUI {
  return {
    id: addr.id,
    name: addr.name,
    street: addr.addressLineOne + (addr.addressLineTwo ? `, ${addr.addressLineTwo}` : ''),
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    isDefault: addr.isDefault || false,
  };
}

/**
 * 将 API 地址数组转换为带 id 的展示地址
 * 使用数组索引作为 id（与原版实现一致）
 */
function toDisplayAddresses(addresses: Address[] | undefined): DisplayAddress[] {
  if (!addresses || !Array.isArray(addresses)) return [];

  return addresses.map((addr, index) => ({
    ...addr,
    id: String(index),
    isDefault: index === 0, // 第一个地址为默认地址
  }));
}

/**
 * 将展示地址转换回 API 地址格式
 */
function toApiAddresses(displayAddresses: DisplayAddress[]): Address[] {
  return displayAddresses.map(({ id: _id, phone: _phone, isDefault: _isDefault, ...addr }) => addr);
}

/**
 * useShippingAddresses hook
 *
 * @example
 * const {
 *   addresses,
 *   isLoading,
 *   error,
 *   addAddress,
 *   updateAddress,
 *   deleteAddress,
 *   setDefaultAddress,
 *   refetch
 * } = useShippingAddresses();
 */
export function useShippingAddresses() {
  const [addresses, setAddresses] = useState<DisplayAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取地址列表
  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const settings = await profileApi.getSettings();
      if (settings?.shippingAddresses) {
        setAddresses(toDisplayAddresses(settings.shippingAddresses));
      } else {
        setAddresses([]);
      }
    } catch (err) {
      console.error('Failed to fetch shipping addresses:', err);
      setError((err as Error).message);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // 保存地址到后端
  const saveAddresses = useCallback(async (newAddresses: DisplayAddress[]) => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await profileApi.setSettings({
        shippingAddresses: toApiAddresses(newAddresses),
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // 更新本地状态（重新计算 isDefault）
      setAddresses(
        newAddresses.map((addr, index) => ({
          ...addr,
          isDefault: index === 0,
        }))
      );

      return true;
    } catch (err) {
      console.error('Failed to save shipping addresses:', err);
      setError((err as Error).message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // 添加地址
  const addAddress = useCallback(
    async (address: Omit<Address, 'id'>) => {
      const newAddress: DisplayAddress = {
        ...address,
        id: String(addresses.length),
        isDefault: addresses.length === 0,
      };

      const newAddresses = [...addresses, newAddress];
      return saveAddresses(newAddresses);
    },
    [addresses, saveAddresses]
  );

  // 更新地址
  const updateAddress = useCallback(
    async (id: string, address: Partial<Address>) => {
      const index = addresses.findIndex(a => a.id === id);
      if (index === -1) return false;

      const newAddresses = [...addresses];
      newAddresses[index] = { ...newAddresses[index], ...address };

      return saveAddresses(newAddresses);
    },
    [addresses, saveAddresses]
  );

  // 删除地址
  const deleteAddress = useCallback(
    async (id: string) => {
      const newAddresses = addresses.filter(a => a.id !== id);
      // 重新分配 id
      const reindexedAddresses = newAddresses.map((addr, index) => ({
        ...addr,
        id: String(index),
        isDefault: index === 0,
      }));

      return saveAddresses(reindexedAddresses);
    },
    [addresses, saveAddresses]
  );

  // 设置默认地址（将其移到第一位）
  const setDefaultAddress = useCallback(
    async (id: string) => {
      const index = addresses.findIndex(a => a.id === id);
      if (index === -1 || index === 0) return false;

      const addr = addresses[index];
      const newAddresses = [addr, ...addresses.filter((_, i) => i !== index)];

      // 重新分配 id 和 isDefault
      const reindexedAddresses = newAddresses.map((a, i) => ({
        ...a,
        id: String(i),
        isDefault: i === 0,
      }));

      return saveAddresses(reindexedAddresses);
    },
    [addresses, saveAddresses]
  );

  // 获取默认地址
  const defaultAddress = addresses.find(a => a.isDefault) || addresses[0] || null;

  return {
    addresses,
    defaultAddress,
    isLoading,
    isSaving,
    error,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refetch: fetchAddresses,
  };
}

export default useShippingAddresses;
