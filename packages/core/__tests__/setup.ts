/**
 * Vitest 测试环境配置
 */

import { beforeAll, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

// Mock fetch
const fetchMock = vi.fn();

beforeAll(() => {
  // Setup localStorage
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Setup fetch
  Object.defineProperty(window, 'fetch', {
    value: fetchMock,
    writable: true,
  });

  // Setup navigator
  Object.defineProperty(window, 'navigator', {
    value: {
      ...window.navigator,
      language: 'en-US',
      onLine: true,
    },
    writable: true,
  });
});

afterEach(() => {
  // Clear mocks
  vi.clearAllMocks();
  localStorageMock.clear();
});
