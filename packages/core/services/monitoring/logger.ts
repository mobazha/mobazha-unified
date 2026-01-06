/**
 * 日志服务
 *
 * 统一的日志记录服务
 * 支持不同级别、格式化、远程上报
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
  tags?: Record<string, string>;
  source?: string;
}

export interface LoggerConfig {
  /** 最小日志级别 */
  minLevel: LogLevel;
  /** 是否输出到控制台 */
  console: boolean;
  /** 是否启用远程日志 */
  remote: boolean;
  /** 远程日志端点 */
  remoteEndpoint?: string;
  /** 批量发送大小 */
  batchSize: number;
  /** 发送间隔 (ms) */
  flushInterval: number;
  /** 是否包含时间戳 */
  timestamps: boolean;
  /** 是否美化输出 */
  pretty: boolean;
}

// 日志级别优先级
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 日志级别颜色 (控制台)
const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};

const RESET_COLOR = '\x1b[0m';

// 默认配置
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  console: true,
  remote: process.env.NODE_ENV === 'production',
  batchSize: 100,
  flushInterval: 10000, // 10 秒
  timestamps: true,
  pretty: process.env.NODE_ENV !== 'production',
};

/**
 * 日志服务类
 */
class LoggerService {
  private config: LoggerConfig = DEFAULT_CONFIG;
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private defaultTags: Record<string, string> = {};

  /**
   * 配置日志服务
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 启动定时刷新
    if (this.config.remote && this.config.remoteEndpoint) {
      this.startFlushTimer();
    }
  }

  /**
   * 设置默认标签
   */
  setDefaultTags(tags: Record<string, string>): void {
    this.defaultTags = { ...this.defaultTags, ...tags };
  }

  /**
   * Debug 日志
   */
  debug(message: string, data?: unknown, tags?: Record<string, string>): void {
    this.log('debug', message, data, tags);
  }

  /**
   * Info 日志
   */
  info(message: string, data?: unknown, tags?: Record<string, string>): void {
    this.log('info', message, data, tags);
  }

  /**
   * Warning 日志
   */
  warn(message: string, data?: unknown, tags?: Record<string, string>): void {
    this.log('warn', message, data, tags);
  }

  /**
   * Error 日志
   */
  error(message: string, data?: unknown, tags?: Record<string, string>): void {
    this.log('error', message, data, tags);
  }

  /**
   * 创建子日志器
   */
  child(source: string, tags?: Record<string, string>): ChildLogger {
    return new ChildLogger(this, source, tags);
  }

  /**
   * 立即刷新日志
   */
  async flush(): Promise<void> {
    await this.flushBuffer();
  }

  /**
   * 停止日志服务
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushBuffer();
  }

  // ============ Internal Methods ============

  /**
   * 记录日志 (供子日志器调用)
   */
  _log(
    level: LogLevel,
    message: string,
    data?: unknown,
    tags?: Record<string, string>,
    source?: string
  ): void {
    // 检查日志级别
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      tags: { ...this.defaultTags, ...tags },
      source,
    };

    // 输出到控制台
    if (this.config.console) {
      this.printToConsole(entry);
    }

    // 添加到缓冲区
    if (this.config.remote) {
      this.buffer.push(entry);

      // 缓冲区满时立即发送
      if (this.buffer.length >= this.config.batchSize) {
        this.flushBuffer();
      }
    }
  }

  /**
   * 记录日志
   */
  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    tags?: Record<string, string>
  ): void {
    this._log(level, message, data, tags);
  }

  /**
   * 打印到控制台
   */
  private printToConsole(entry: LogEntry): void {
    const color = LOG_COLORS[entry.level];
    const levelStr = entry.level.toUpperCase().padEnd(5);

    let output = '';

    if (this.config.timestamps) {
      output += `[${entry.timestamp}] `;
    }

    if (typeof window === 'undefined') {
      // Node.js 环境，使用颜色
      output += `${color}${levelStr}${RESET_COLOR}`;
    } else {
      output += levelStr;
    }

    if (entry.source) {
      output += ` [${entry.source}]`;
    }

    output += ` ${entry.message}`;

    // eslint-disable-next-line no-console
    const consoleFn =
      entry.level === 'error' ? console.error : entry.level === 'warn' ? console.warn : console.log;

    if (entry.data !== undefined) {
      if (this.config.pretty) {
        consoleFn(output);
        consoleFn(entry.data);
      } else {
        consoleFn(output, JSON.stringify(entry.data));
      }
    } else {
      consoleFn(output);
    }
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.flushInterval);
  }

  /**
   * 刷新缓冲区
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0 || !this.config.remoteEndpoint) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: entries }),
      });
    } catch {
      // 发送失败，将日志放回缓冲区
      this.buffer = [...entries, ...this.buffer];
    }
  }
}

/**
 * 子日志器类
 */
class ChildLogger {
  private parent: LoggerService;
  private source: string;
  private tags: Record<string, string>;

  constructor(parent: LoggerService, source: string, tags?: Record<string, string>) {
    this.parent = parent;
    this.source = source;
    this.tags = tags || {};
  }

  debug(message: string, data?: unknown, tags?: Record<string, string>): void {
    this.parent._log('debug', message, data, { ...this.tags, ...tags }, this.source);
  }

  info(message: string, data?: unknown, tags?: Record<string, string>): void {
    this.parent._log('info', message, data, { ...this.tags, ...tags }, this.source);
  }

  warn(message: string, data?: unknown, tags?: Record<string, string>): void {
    this.parent._log('warn', message, data, { ...this.tags, ...tags }, this.source);
  }

  error(message: string, data?: unknown, tags?: Record<string, string>): void {
    this.parent._log('error', message, data, { ...this.tags, ...tags }, this.source);
  }
}

// 导出单例
export const logger = new LoggerService();
