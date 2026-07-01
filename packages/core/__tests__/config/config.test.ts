/**
 * 配置模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getConfig,
  setConfig,
  isMockMode,
  enableMockData,
  disableMockData,
  toggleMockData,
} from '../../config';

describe('config', () => {
  beforeEach(() => {
    // 重置配置
    setConfig({ useMockData: true });
  });

  describe('getConfig', () => {
    it('应返回默认配置', () => {
      const config = getConfig();
      expect(config).toHaveProperty('useMockData');
      expect(config).toHaveProperty('apiBaseUrl');
      expect(config).toHaveProperty('matrixHomeserver');
      expect(config).toHaveProperty('debug');
    });
  });

  describe('setConfig', () => {
    it('应更新配置', () => {
      setConfig({ useMockData: false });
      expect(getConfig().useMockData).toBe(false);
    });

    it('应保留未更新的配置', () => {
      const originalConfig = getConfig();
      setConfig({ useMockData: false });
      expect(getConfig().apiBaseUrl).toBe(originalConfig.apiBaseUrl);
    });
  });

  describe('isMockMode', () => {
    it('应返回当前 Mock 模式状态', () => {
      enableMockData();
      expect(isMockMode()).toBe(true);

      disableMockData();
      expect(isMockMode()).toBe(false);
    });
  });

  describe('enableMockData / disableMockData', () => {
    it('应启用 Mock 数据', () => {
      disableMockData();
      enableMockData();
      expect(isMockMode()).toBe(true);
    });

    it('应禁用 Mock 数据', () => {
      enableMockData();
      disableMockData();
      expect(isMockMode()).toBe(false);
    });
  });

  describe('toggleMockData', () => {
    it('应切换 Mock 模式', () => {
      enableMockData();
      const newState = toggleMockData();
      expect(newState).toBe(false);
      expect(isMockMode()).toBe(false);
    });

    it('应返回新的状态', () => {
      disableMockData();
      const newState = toggleMockData();
      expect(newState).toBe(true);
    });
  });
});
