/**
 * 错误跟踪服务
 *
 * 统一的错误捕获和上报服务
 * 支持多种后端: Sentry, LogRocket, 自定义等
 */

export interface ErrorContext {
  /** 用户 ID */
  userId?: string;
  /** 额外标签 */
  tags?: Record<string, string>;
  /** 额外数据 */
  extra?: Record<string, unknown>;
  /** 错误级别 */
  level?: ErrorLevel;
  /** 指纹 (用于分组) */
  fingerprint?: string[];
}

export type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorTrackerConfig {
  /** 是否启用 */
  enabled: boolean;
  /** DSN (Sentry 等服务的连接字符串) */
  dsn?: string;
  /** 环境 */
  environment: string;
  /** 发布版本 */
  release?: string;
  /** 采样率 (0-1) */
  sampleRate: number;
  /** 是否上报到控制台 */
  debug: boolean;
  /** 忽略的错误 */
  ignoreErrors?: (string | RegExp)[];
  /** 忽略的 URL */
  ignoreUrls?: (string | RegExp)[];
  /** 自定义上报端点 */
  reportEndpoint?: string;
}

// 默认配置
const DEFAULT_CONFIG: ErrorTrackerConfig = {
  enabled: true,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_VERSION,
  sampleRate: 1.0,
  debug: process.env.NODE_ENV === 'development',
  ignoreErrors: [
    // 常见的无害错误
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    /Loading chunk .* failed/,
    /Network request failed/,
  ],
};

/**
 * 错误跟踪服务类
 */
class ErrorTrackerService {
  private config: ErrorTrackerConfig = DEFAULT_CONFIG;
  private isInitialized = false;
  private errorQueue: Array<{ error: Error; context: ErrorContext }> = [];
  private userContext: Partial<ErrorContext> = {};

  /**
   * 初始化错误跟踪
   */
  async initialize(config?: Partial<ErrorTrackerConfig>): Promise<void> {
    if (this.isInitialized) return;

    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.enabled) {
      return;
    }

    // 设置全局错误处理
    this.setupGlobalHandlers();

    // 处理队列中的错误
    this.flushErrorQueue();

    this.isInitialized = true;
  }

  /**
   * 设置用户上下文
   */
  setUser(user: { id?: string; email?: string; username?: string }): void {
    this.userContext = {
      userId: user.id,
      tags: {
        ...(user.email && { email: user.email }),
        ...(user.username && { username: user.username }),
      },
    };
  }

  /**
   * 清除用户上下文
   */
  clearUser(): void {
    this.userContext = {};
  }

  /**
   * 捕获异常
   */
  captureException(error: Error, context?: ErrorContext): string {
    const errorId = this.generateErrorId();

    const fullContext: ErrorContext = {
      ...this.userContext,
      ...context,
      tags: {
        ...this.userContext.tags,
        ...context?.tags,
      },
    };

    // 检查是否应该忽略
    if (this.shouldIgnore(error)) {
      return errorId;
    }

    // 如果未初始化，加入队列
    if (!this.isInitialized) {
      this.errorQueue.push({ error, context: fullContext });
      return errorId;
    }

    // 上报错误
    this.reportError(error, fullContext, errorId);

    return errorId;
  }

  /**
   * 捕获消息
   */
  captureMessage(message: string, context?: ErrorContext): string {
    const error = new Error(message);
    return this.captureException(error, {
      ...context,
      level: context?.level || 'info',
    });
  }

  /**
   * 添加面包屑 (操作记录)
   */
  addBreadcrumb(breadcrumb: {
    category: string;
    message: string;
    level?: ErrorLevel;
    data?: Record<string, unknown>;
  }): void {
    if (this.config.debug) {
      const timestamp = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log(
        `[Breadcrumb ${timestamp}] [${breadcrumb.category}] ${breadcrumb.message}`,
        breadcrumb.data
      );
    }

    // 可以发送到后端存储
  }

  /**
   * 开始事务 (用于性能追踪)
   */
  startTransaction(name: string, op: string): Transaction {
    return new Transaction(name, op, this.config.debug);
  }

  /**
   * 设置全局标签
   */
  setTag(key: string, value: string): void {
    this.userContext.tags = {
      ...this.userContext.tags,
      [key]: value,
    };
  }

  /**
   * 设置全局额外数据
   */
  setExtra(key: string, value: unknown): void {
    this.userContext.extra = {
      ...this.userContext.extra,
      [key]: value,
    };
  }

  // ============ Private Methods ============

  /**
   * 设置全局错误处理器
   */
  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return;

    // 未捕获的错误
    window.addEventListener('error', event => {
      this.captureException(event.error || new Error(event.message), {
        tags: { type: 'unhandled' },
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // 未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', event => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

      this.captureException(error, {
        tags: { type: 'unhandledrejection' },
      });
    });
  }

  /**
   * 检查是否应该忽略错误
   */
  private shouldIgnore(error: Error): boolean {
    const message = error.message || '';

    for (const pattern of this.config.ignoreErrors || []) {
      if (typeof pattern === 'string') {
        if (message.includes(pattern)) return true;
      } else if (pattern.test(message)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 上报错误
   */
  private reportError(error: Error, context: ErrorContext, errorId: string): void {
    const payload = {
      errorId,
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      release: this.config.release,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // 调试模式下打印
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.error('[ErrorTracker]', payload);
    }

    // 采样
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    // 发送到自定义端点
    if (this.config.reportEndpoint) {
      this.sendToEndpoint(payload);
    }
  }

  /**
   * 发送到上报端点
   */
  private async sendToEndpoint(payload: unknown): Promise<void> {
    if (!this.config.reportEndpoint) return;

    try {
      await fetch(this.config.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // 静默失败，避免无限循环
    }
  }

  /**
   * 处理错误队列
   */
  private flushErrorQueue(): void {
    while (this.errorQueue.length > 0) {
      const item = this.errorQueue.shift();
      if (item) {
        this.captureException(item.error, item.context);
      }
    }
  }

  /**
   * 生成错误 ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 事务类 (用于性能追踪)
 */
class Transaction {
  private name: string;
  private op: string;
  private startTime: number;
  private spans: Array<{ name: string; startTime: number; endTime?: number; data?: unknown }> = [];
  private debug: boolean;

  constructor(name: string, op: string, debug: boolean) {
    this.name = name;
    this.op = op;
    this.startTime = performance.now();
    this.debug = debug;
  }

  /**
   * 开始一个 span
   */
  startSpan(name: string): Span {
    const span = {
      name,
      startTime: performance.now(),
    };
    this.spans.push(span);
    return new Span(span, this.debug);
  }

  /**
   * 完成事务
   */
  finish(): void {
    const duration = performance.now() - this.startTime;

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`[Transaction] ${this.name} (${this.op}): ${duration.toFixed(2)}ms`, {
        spans: this.spans.map(s => ({
          name: s.name,
          duration: s.endTime ? s.endTime - s.startTime : 'not finished',
        })),
      });
    }
  }
}

/**
 * Span 类
 */
class Span {
  private span: { name: string; startTime: number; endTime?: number; data?: unknown };
  private debug: boolean;

  constructor(
    span: { name: string; startTime: number; endTime?: number; data?: unknown },
    debug: boolean
  ) {
    this.span = span;
    this.debug = debug;
  }

  /**
   * 设置数据
   */
  setData(data: unknown): void {
    this.span.data = data;
  }

  /**
   * 完成 span
   */
  finish(): void {
    this.span.endTime = performance.now();

    if (this.debug) {
      const duration = this.span.endTime - this.span.startTime;
      // eslint-disable-next-line no-console
      console.log(`[Span] ${this.span.name}: ${duration.toFixed(2)}ms`, this.span.data);
    }
  }
}

// 导出单例
export const errorTracker = new ErrorTrackerService();
