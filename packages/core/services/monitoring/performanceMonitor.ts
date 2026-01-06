/**
 * 性能监控服务
 *
 * 提供以下功能:
 * - Web Vitals 监控
 * - 自定义指标
 * - 资源加载监控
 * - API 性能监控
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface WebVitals {
  /** Largest Contentful Paint */
  LCP?: number;
  /** First Input Delay */
  FID?: number;
  /** Cumulative Layout Shift */
  CLS?: number;
  /** First Contentful Paint */
  FCP?: number;
  /** Time to First Byte */
  TTFB?: number;
  /** Interaction to Next Paint */
  INP?: number;
}

export interface PerformanceConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 是否收集 Web Vitals */
  collectWebVitals: boolean;
  /** 是否收集资源计时 */
  collectResourceTiming: boolean;
  /** 是否收集导航计时 */
  collectNavigationTiming: boolean;
  /** 上报端点 */
  reportEndpoint?: string;
  /** 上报间隔 (ms) */
  reportInterval: number;
  /** 调试模式 */
  debug: boolean;
}

// 默认配置
const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: true,
  collectWebVitals: true,
  collectResourceTiming: true,
  collectNavigationTiming: true,
  reportInterval: 30000, // 30 秒
  debug: process.env.NODE_ENV === 'development',
};

/**
 * 性能监控服务类
 */
class PerformanceMonitorService {
  private config: PerformanceConfig = DEFAULT_CONFIG;
  private isInitialized = false;
  private metrics: PerformanceMetric[] = [];
  private webVitals: WebVitals = {};
  private reportTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 初始化性能监控
   */
  async initialize(config?: Partial<PerformanceConfig>): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.enabled) return;

    // 收集 Web Vitals
    if (this.config.collectWebVitals) {
      this.collectWebVitals();
    }

    // 收集导航计时
    if (this.config.collectNavigationTiming) {
      this.collectNavigationTiming();
    }

    // 监控资源加载
    if (this.config.collectResourceTiming) {
      this.observeResourceTiming();
    }

    // 定期上报
    this.startReportTimer();

    this.isInitialized = true;
  }

  /**
   * 记录自定义指标
   */
  recordMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'] = 'ms',
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[Performance] ${name}: ${value}${unit}`, tags);
    }
  }

  /**
   * 测量函数执行时间
   */
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.recordMetric(name, duration, 'ms');

    return result;
  }

  /**
   * 测量异步函数执行时间
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.recordMetric(name, duration, 'ms');

    return result;
  }

  /**
   * 开始计时
   */
  startTimer(name: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'ms');
    };
  }

  /**
   * 获取 Web Vitals
   */
  getWebVitals(): WebVitals {
    return { ...this.webVitals };
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 清空指标
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    this.isInitialized = false;
  }

  // ============ Private Methods ============

  /**
   * 收集 Web Vitals
   */
  private async collectWebVitals(): Promise<void> {
    try {
      // 动态导入 web-vitals (如果可用)
      const { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } = await import('web-vitals');

      onCLS(metric => {
        this.webVitals.CLS = metric.value;
        this.recordMetric('web_vitals_cls', metric.value, 'count', { rating: metric.rating });
      });

      onFID(metric => {
        this.webVitals.FID = metric.value;
        this.recordMetric('web_vitals_fid', metric.value, 'ms', { rating: metric.rating });
      });

      onLCP(metric => {
        this.webVitals.LCP = metric.value;
        this.recordMetric('web_vitals_lcp', metric.value, 'ms', { rating: metric.rating });
      });

      onFCP(metric => {
        this.webVitals.FCP = metric.value;
        this.recordMetric('web_vitals_fcp', metric.value, 'ms', { rating: metric.rating });
      });

      onTTFB(metric => {
        this.webVitals.TTFB = metric.value;
        this.recordMetric('web_vitals_ttfb', metric.value, 'ms', { rating: metric.rating });
      });

      onINP(metric => {
        this.webVitals.INP = metric.value;
        this.recordMetric('web_vitals_inp', metric.value, 'ms', { rating: metric.rating });
      });
    } catch {
      // web-vitals 不可用时使用降级方案
      this.collectWebVitalsFallback();
    }
  }

  /**
   * Web Vitals 降级收集
   */
  private collectWebVitalsFallback(): void {
    // 使用 Performance API 收集基本指标
    if (typeof window === 'undefined' || !window.performance) return;

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          this.webVitals.LCP = entry.startTime;
          this.recordMetric('web_vitals_lcp', entry.startTime, 'ms');
        }

        if (entry.entryType === 'first-input') {
          const fidEntry = entry as PerformanceEventTiming;
          this.webVitals.FID = fidEntry.processingStart - fidEntry.startTime;
          this.recordMetric('web_vitals_fid', this.webVitals.FID, 'ms');
        }

        if (entry.entryType === 'layout-shift' && !(entry as LayoutShift).hadRecentInput) {
          this.webVitals.CLS = (this.webVitals.CLS || 0) + (entry as LayoutShift).value;
          this.recordMetric('web_vitals_cls', this.webVitals.CLS, 'count');
        }
      }
    });

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      observer.observe({ type: 'first-input', buffered: true });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // 某些浏览器可能不支持
    }
  }

  /**
   * 收集导航计时
   */
  private collectNavigationTiming(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // 等待页面加载完成
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (!timing) return;

        // DNS 查询
        this.recordMetric(
          'navigation_dns',
          timing.domainLookupEnd - timing.domainLookupStart,
          'ms'
        );

        // TCP 连接
        this.recordMetric('navigation_tcp', timing.connectEnd - timing.connectStart, 'ms');

        // TLS 握手
        if (timing.secureConnectionStart > 0) {
          this.recordMetric(
            'navigation_tls',
            timing.connectEnd - timing.secureConnectionStart,
            'ms'
          );
        }

        // 请求时间
        this.recordMetric('navigation_request', timing.responseStart - timing.requestStart, 'ms');

        // 响应时间
        this.recordMetric('navigation_response', timing.responseEnd - timing.responseStart, 'ms');

        // DOM 解析
        this.recordMetric('navigation_dom_parse', timing.domInteractive - timing.responseEnd, 'ms');

        // DOM 完成
        this.recordMetric(
          'navigation_dom_complete',
          timing.domComplete - timing.domInteractive,
          'ms'
        );

        // 页面加载总时间
        this.recordMetric('navigation_load', timing.loadEventEnd - timing.fetchStart, 'ms');
      }, 0);
    });
  }

  /**
   * 监控资源加载
   */
  private observeResourceTiming(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;

        // 只记录慢资源 (>500ms)
        if (resource.duration > 500) {
          this.recordMetric('resource_slow', resource.duration, 'ms', {
            name: resource.name.split('/').pop() || 'unknown',
            type: resource.initiatorType,
          });
        }
      }
    });

    try {
      observer.observe({ type: 'resource', buffered: true });
    } catch {
      // 某些浏览器可能不支持
    }
  }

  /**
   * 启动上报定时器
   */
  private startReportTimer(): void {
    if (!this.config.reportEndpoint) return;

    this.reportTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.reportInterval);
  }

  /**
   * 发送指标到后端
   */
  private async flushMetrics(): Promise<void> {
    if (!this.config.reportEndpoint || this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      await fetch(this.config.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: metricsToSend,
          webVitals: this.webVitals,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch {
      // 发送失败，将指标放回队列
      this.metrics = [...metricsToSend, ...this.metrics];
    }
  }
}

// LayoutShift 类型定义
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

// 导出单例
export const performanceMonitor = new PerformanceMonitorService();
