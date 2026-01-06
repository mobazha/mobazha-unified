/**
 * 监控 Hook
 *
 * 提供错误跟踪和性能监控的 React Hook
 */

import { useEffect, useCallback, useRef } from 'react';
import { errorTracker } from '../services/monitoring/errorTracker';
import { performanceMonitor } from '../services/monitoring/performanceMonitor';
import { logger } from '../services/monitoring/logger';
import type { ErrorContext } from '../services/monitoring/errorTracker';
import type { WebVitals } from '../services/monitoring/performanceMonitor';

export interface UseMonitoringOptions {
  /** 组件/页面名称 */
  name: string;
  /** 是否追踪渲染性能 */
  trackRender?: boolean;
  /** 额外标签 */
  tags?: Record<string, string>;
}

export interface UseMonitoringReturn {
  /** 捕获异常 */
  captureError: (error: Error, context?: ErrorContext) => string;
  /** 记录指标 */
  recordMetric: (
    name: string,
    value: number,
    unit?: 'ms' | 's' | 'bytes' | 'count' | 'percent'
  ) => void;
  /** 开始计时 */
  startTimer: (name: string) => () => void;
  /** 测量函数执行时间 */
  measure: <T>(name: string, fn: () => T) => T;
  /** 测量异步函数执行时间 */
  measureAsync: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  /** 获取 Web Vitals */
  getWebVitals: () => WebVitals;
  /** 日志器 */
  log: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
}

/**
 * 监控 Hook
 *
 * @example
 * ```tsx
 * function ProductPage() {
 *   const { captureError, measure, log } = useMonitoring({
 *     name: 'ProductPage',
 *     trackRender: true,
 *   });
 *
 *   useEffect(() => {
 *     try {
 *       const data = measure('fetchProduct', () => api.getProduct());
 *       log.info('Product loaded', { id: data.id });
 *     } catch (error) {
 *       captureError(error);
 *     }
 *   }, []);
 * }
 * ```
 */
export function useMonitoring(options: UseMonitoringOptions): UseMonitoringReturn {
  const { name, trackRender = false, tags } = options;
  const renderCountRef = useRef(0);
  const renderStartRef = useRef(0);

  // 追踪渲染性能
  useEffect(() => {
    if (trackRender) {
      renderCountRef.current += 1;
      const renderTime = performance.now() - renderStartRef.current;

      performanceMonitor.recordMetric(`${name}_render`, renderTime, 'ms', {
        renderCount: String(renderCountRef.current),
        ...tags,
      });
    }
  });

  // 组件挂载/卸载追踪
  useEffect(() => {
    renderStartRef.current = performance.now();

    logger.debug(`Component mounted: ${name}`, undefined, tags);

    return () => {
      logger.debug(
        `Component unmounted: ${name}`,
        {
          totalRenders: renderCountRef.current,
        },
        tags
      );
    };
  }, [name, tags]);

  // 捕获异常
  const captureError = useCallback(
    (error: Error, context?: ErrorContext) => {
      return errorTracker.captureException(error, {
        ...context,
        tags: {
          component: name,
          ...tags,
          ...context?.tags,
        },
      });
    },
    [name, tags]
  );

  // 记录指标
  const recordMetric = useCallback(
    (
      metricName: string,
      value: number,
      unit: 'ms' | 's' | 'bytes' | 'count' | 'percent' = 'ms'
    ) => {
      performanceMonitor.recordMetric(`${name}_${metricName}`, value, unit, tags);
    },
    [name, tags]
  );

  // 开始计时
  const startTimer = useCallback(
    (timerName: string) => {
      return performanceMonitor.startTimer(`${name}_${timerName}`);
    },
    [name]
  );

  // 测量函数
  const measure = useCallback(
    <T>(measureName: string, fn: () => T): T => {
      return performanceMonitor.measure(`${name}_${measureName}`, fn);
    },
    [name]
  );

  // 测量异步函数
  const measureAsync = useCallback(
    async <T>(measureName: string, fn: () => Promise<T>): Promise<T> => {
      return performanceMonitor.measureAsync(`${name}_${measureName}`, fn);
    },
    [name]
  );

  // 获取 Web Vitals
  const getWebVitals = useCallback(() => {
    return performanceMonitor.getWebVitals();
  }, []);

  // 创建子日志器
  const childLogger = logger.child(name, tags);

  const log = {
    debug: (message: string, data?: unknown) => childLogger.debug(message, data),
    info: (message: string, data?: unknown) => childLogger.info(message, data),
    warn: (message: string, data?: unknown) => childLogger.warn(message, data),
    error: (message: string, data?: unknown) => childLogger.error(message, data),
  };

  return {
    captureError,
    recordMetric,
    startTimer,
    measure,
    measureAsync,
    getWebVitals,
    log,
  };
}

export default useMonitoring;
