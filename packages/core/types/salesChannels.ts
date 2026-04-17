/**
 * Sales Channels Types
 *
 * Types for Store Links and Store Bots (Telegram Bot binding).
 * Maps to backend responses from /platform/v1/store-links and /platform/v1/store-bots.
 */

export interface StoreLinkInfo {
  shortCode: string;
  telegramLink?: string;
  directLink?: string;
  deepLink?: string;
}

export interface StoreBotInfo {
  botID: number;
  botUsername: string;
  isActive: boolean;
  directLink: string;
  /** Hosting：子域名 / 已验证自定义域等推荐根 URL（与 BotFather Web App URL 对齐） */
  recommendedWebAppUrls?: string[];
  /** MS2b.2 Wave 2：后端已完成 setWebhook 并在 Telegram 侧生效 */
  webhookConfigured?: boolean;
  /** MS2b.2 Wave 2：非致命警告（如 setMyCommands 失败但 webhook 已就绪） */
  warnings?: string[];
}

export interface BindStoreBotRequest {
  peerID: string;
  botToken: string;
}

/**
 * MS2b.2 Wave 4 — 自建 Bot webhook 诊断响应。
 * 对应后端 `WebhookStatusResponse`。
 */
export interface BotWebhookStatus {
  /** 本地 DB 是否有活跃 webhook 配置（setWebhook 曾成功） */
  configured: boolean;
  /** Hosting 期望 Telegram 指向的 URL */
  expectedUrl?: string;
  /** Telegram 侧实际记录的 URL（getWebhookInfo 返回） */
  telegramUrl?: string;
  /**
   * configured=true && telegramUrl === expectedUrl && 无 lastErrorMessage 时为 true。
   * 前端用此值给出 "健康 / 需要修复" 的总体判断。
   */
  inSync: boolean;

  /** Telegram 侧尚未投递的 update 数 */
  pendingUpdateCount: number;
  /** Telegram 最近一次推送失败的时间戳（秒） */
  lastErrorDate?: number;
  /** Telegram 最近一次推送失败的错误消息 */
  lastErrorMessage?: string;

  /** Telegram 记录的 setWebhook 配置 */
  maxConnections?: number;
  allowedUpdates?: string[];

  /** 本地 DB 的 webhook_last_error（provisioning 失败） */
  localLastError?: string;

  /** /setMyCommands 成功时间（ISO string） */
  commandsConfiguredAt?: string;
  /** /setChatMenuButton 成功时间（ISO string） */
  menuButtonConfiguredAt?: string;

  /** 调用 Telegram getWebhookInfo 失败（token 损坏 / 网络） */
  telegramUnreachable?: boolean;
  telegramError?: string;
}
