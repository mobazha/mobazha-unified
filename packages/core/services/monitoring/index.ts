/**
 * 监控服务导出
 */

// 错误跟踪
export { errorTracker } from './errorTracker';
export type { ErrorContext, ErrorLevel, ErrorTrackerConfig } from './errorTracker';

// 性能监控
export { performanceMonitor } from './performanceMonitor';
export type { PerformanceMetric, WebVitals, PerformanceConfig } from './performanceMonitor';

// 日志服务
export { logger } from './logger';
export type { LogLevel, LogEntry, LoggerConfig } from './logger';

/**
 * 初始化所有监控服务
 */
export async function initializeMonitoring(options?: {
  errorTracker?: Parameters<typeof import('./errorTracker').errorTracker.initialize>[0];
  performance?: Parameters<typeof import('./performanceMonitor').performanceMonitor.initialize>[0];
  logger?: Parameters<typeof import('./logger').logger.configure>[0];
}): Promise<void> {
  const { errorTracker } = await import('./errorTracker');
  const { performanceMonitor } = await import('./performanceMonitor');
  const { logger } = await import('./logger');

  // 初始化错误跟踪
  await errorTracker.initialize(options?.errorTracker);

  // 初始化性能监控
  await performanceMonitor.initialize(options?.performance);

  // 配置日志服务
  if (options?.logger) {
    logger.configure(options.logger);
  }
}
