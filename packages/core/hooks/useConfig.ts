/**
 * useConfig Hook
 *
 * React hook for accessing and managing application configuration.
 * Provides easy access to the mock data toggle and other settings.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getConfig,
  setConfig,
  isMockMode as checkMockData,
  enableMockData,
  disableMockData,
  toggleMockData,
  type AppConfig,
} from '../config';

interface UseConfigReturn {
  /** Current configuration */
  config: AppConfig;
  /** Whether mock data is currently enabled */
  isMockMode: boolean;
  /** Enable mock data mode */
  enableMock: () => void;
  /** Disable mock data mode (use real API) */
  disableMock: () => void;
  /** Toggle mock data mode */
  toggleMock: () => void;
  /** Update configuration */
  updateConfig: (newConfig: Partial<AppConfig>) => void;
}

/**
 * Hook for managing application configuration
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMockMode, toggleMock } = useConfig();
 *
 *   return (
 *     <button onClick={toggleMock}>
 *       {isMockMode ? 'Using Mock Data' : 'Using Real API'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useConfig(): UseConfigReturn {
  const [config, setLocalConfig] = useState<AppConfig>(getConfig());
  const [isMockMode, setIsMockMode] = useState(checkMockData());

  // Sync state with global config
  useEffect(() => {
    const interval = setInterval(() => {
      const currentConfig = getConfig();
      const currentMockMode = checkMockData();

      if (currentMockMode !== isMockMode) {
        setIsMockMode(currentMockMode);
      }

      if (JSON.stringify(currentConfig) !== JSON.stringify(config)) {
        setLocalConfig(currentConfig);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [config, isMockMode]);

  const enableMock = useCallback(() => {
    enableMockData();
    setIsMockMode(true);
  }, []);

  const disableMock = useCallback(() => {
    disableMockData();
    setIsMockMode(false);
  }, []);

  const toggleMock = useCallback(() => {
    const newValue = toggleMockData();
    setIsMockMode(newValue);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<AppConfig>) => {
    setConfig(newConfig);
    setLocalConfig(getConfig());
    setIsMockMode(checkMockData());
  }, []);

  return {
    config,
    isMockMode,
    enableMock,
    disableMock,
    toggleMock,
    updateConfig,
  };
}

export default useConfig;
