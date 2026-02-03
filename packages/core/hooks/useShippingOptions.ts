/**
 * useShippingOptions hook
 * 管理店铺的配送选项设置
 */

import { useState, useCallback, useEffect } from 'react';
import { profileApi } from '../services/api';
import type { ShippingOptionSetting, ShippingServiceSetting } from '../types';

/**
 * 创建空的配送服务（用于表单初始化）
 */
export function createEmptyService(): ShippingServiceSetting {
  return {
    name: '',
    estimatedDelivery: '',
    startWeight: 0,
    endWeight: 0,
    firstWeight: 0,
    firstFreight: '0',
    renewalUnitWeight: 0,
    renewalUnitPrice: '0',
    registrationFee: '0',
  };
}

/**
 * 创建空的配送选项（用于表单初始化）
 */
export function createEmptyOption(currency = 'USD'): ShippingOptionSetting {
  return {
    name: '',
    type: 'FIXED_PRICE',
    currency,
    serviceType: 'SAME_WEIGHT_SAME_FEE',
    regions: [],
    services: [createEmptyService()],
  };
}

/**
 * useShippingOptions hook
 *
 * @example
 * const {
 *   options,
 *   isLoading,
 *   error,
 *   addOption,
 *   updateOption,
 *   deleteOption,
 *   refetch
 * } = useShippingOptions();
 */
export function useShippingOptions() {
  const [options, setOptions] = useState<ShippingOptionSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取配送选项列表
  const fetchOptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const settings = await profileApi.getSettings();
      if (settings?.shippingOptions) {
        setOptions(settings.shippingOptions);
      } else {
        setOptions([]);
      }
    } catch (err) {
      console.error('Failed to fetch shipping options:', err);
      setError((err as Error).message);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // 保存配送选项到后端
  const saveOptions = useCallback(
    async (newOptions: ShippingOptionSetting[]) => {
      setIsSaving(true);
      setError(null);

      try {
        const result = await profileApi.setSettings({
          shippingOptions: newOptions,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        // 重新获取最新数据（后端会分配 ID）
        await fetchOptions();
        return true;
      } catch (err) {
        console.error('Failed to save shipping options:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchOptions]
  );

  // 添加配送选项
  const addOption = useCallback(
    async (option: ShippingOptionSetting) => {
      // 新选项不需要 id，后端会自动分配
      const newOption = { ...option };
      delete newOption.id;

      const newOptions = [...options, newOption];
      return saveOptions(newOptions);
    },
    [options, saveOptions]
  );

  // 更新配送选项
  const updateOption = useCallback(
    async (id: number, option: Partial<ShippingOptionSetting>) => {
      const index = options.findIndex(o => o.id === id);
      if (index === -1) return false;

      const newOptions = [...options];
      newOptions[index] = { ...newOptions[index], ...option };

      return saveOptions(newOptions);
    },
    [options, saveOptions]
  );

  // 删除配送选项
  const deleteOption = useCallback(
    async (id: number) => {
      const newOptions = options.filter(o => o.id !== id);
      return saveOptions(newOptions);
    },
    [options, saveOptions]
  );

  // 批量更新所有选项
  const setAllOptions = useCallback(
    async (newOptions: ShippingOptionSetting[]) => {
      return saveOptions(newOptions);
    },
    [saveOptions]
  );

  return {
    options,
    isLoading,
    isSaving,
    error,
    addOption,
    updateOption,
    deleteOption,
    setAllOptions,
    refetch: fetchOptions,
    // 辅助函数
    createEmptyOption,
    createEmptyService,
  };
}

export default useShippingOptions;
