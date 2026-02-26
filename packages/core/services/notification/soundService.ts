/**
 * 声音提醒服务
 *
 * 提供差异化的声音提醒和可选的 TTS 语音播报
 *
 * 功能：
 * - 不同业务场景使用不同提示音
 * - 可选的 TTS 语音播报（支持多语言）
 * - 冷却时间防止频繁提醒
 * - 用户设置管理
 */

/* eslint-disable no-undef */
// 浏览器 API 类型在 Node.js 环境下不可用，但此服务仅在浏览器中运行

import type { SoundNotificationType } from '../../types/notification';
import { SOUND_CONFIGS } from '../../types/notification';
import { useNotificationStore, getNotificationSettings } from '../../stores/notificationStore';
import { getI18n } from '../../i18n/i18n';

// ============ 常量 ============

/** 音频文件路径前缀 */
const AUDIO_PATH_PREFIX = '/audio/';

/** TTS i18n 键映射 */
const TTS_I18N_KEYS: Record<SoundNotificationType, string> = {
  chat_message: 'notifications.tts.newMessage',
  order_chat: 'notifications.tts.orderChat',
  new_order: 'notifications.tts.newOrder',
  payment: 'notifications.tts.payment',
  dispute: 'notifications.tts.dispute',
  order_complete: 'notifications.tts.orderComplete',
};

/** TTS 默认文本（当 i18n 不可用时） */
const TTS_DEFAULT_TEXT: Record<SoundNotificationType, string> = {
  chat_message: 'New message',
  order_chat: 'Order message',
  new_order: 'New order received',
  payment: 'Payment received',
  dispute: 'Dispute requires attention',
  order_complete: 'Order completed',
};

/** 语言代码映射到 TTS 语言代码 */
const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  'en-US': 'en-US',
  zh: 'zh-CN',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  ja: 'ja-JP',
  'ja-JP': 'ja-JP',
  ko: 'ko-KR',
  'ko-KR': 'ko-KR',
  es: 'es-ES',
  'es-ES': 'es-ES',
  fr: 'fr-FR',
  'fr-FR': 'fr-FR',
  de: 'de-DE',
  'de-DE': 'de-DE',
  ru: 'ru-RU',
  'ru-RU': 'ru-RU',
  pt: 'pt-BR',
  'pt-BR': 'pt-BR',
};

/** 语音优先级配置（按质量排序） */
const VOICE_PREFERENCES: Record<string, string[]> = {
  'zh-CN': [
    'Ting-Ting', // macOS/iOS 高质量女声
    'Google 普通话（中国大陆）', // Android Chrome
    'Microsoft Huihui', // Windows 女声
    'Microsoft Yaoyao', // Windows 女声
    'Lili', // 其他中文女声
  ],
  'zh-TW': [
    'Mei-Jia', // macOS/iOS 台湾女声
    'Microsoft Hanhan', // Windows
  ],
  'en-US': [
    'Samantha', // macOS 女声
    'Google US English', // Chrome
    'Microsoft Zira', // Windows 女声
    'Alex', // macOS 男声
  ],
  'ja-JP': [
    'Kyoko', // macOS/iOS 日语女声
    'Google 日本語', // Chrome
    'Microsoft Haruka', // Windows
  ],
  'ko-KR': [
    'Yuna', // macOS/iOS 韩语女声
    'Google 한국의', // Chrome
  ],
  'es-ES': [
    'Monica', // macOS 西班牙语女声
    'Google español', // Chrome
    'Microsoft Helena', // Windows
  ],
  'fr-FR': [
    'Thomas', // macOS 法语
    'Google français', // Chrome
    'Microsoft Hortense', // Windows
  ],
  'de-DE': [
    'Anna', // macOS 德语女声
    'Google Deutsch', // Chrome
    'Microsoft Hedda', // Windows
  ],
  'ru-RU': [
    'Milena', // macOS 俄语女声
    'Google русский', // Chrome
    'Microsoft Irina', // Windows
  ],
  'pt-BR': [
    'Luciana', // macOS 葡萄牙语女声
    'Google português do Brasil', // Chrome
    'Microsoft Maria', // Windows
  ],
};

// ============ 类定义 ============

/**
 * 声音服务类
 */
class SoundService {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private lastPlayedTime: Map<SoundNotificationType, number> = new Map();
  private initialized = false;

  /**
   * 初始化服务
   */
  init(): void {
    if (this.initialized) return;

    // 仅在浏览器环境中初始化
    if (typeof window === 'undefined') {
      return;
    }

    this.preloadAudio();
    this.initialized = true;
  }

  /**
   * 预加载音频文件
   */
  private preloadAudio(): void {
    if (typeof window === 'undefined') return;

    const settings = getNotificationSettings();

    // 预加载所有配置的音频文件
    Object.values(SOUND_CONFIGS).forEach(config => {
      const audioPath = `${AUDIO_PATH_PREFIX}${config.soundFile}`;

      if (!this.audioCache.has(audioPath)) {
        try {
          const audio = new Audio(audioPath);
          audio.volume = settings.volume;
          audio.preload = 'auto';

          // 错误处理：使用默认音效
          audio.onerror = () => {
            console.warn(`[SoundService] Failed to load: ${audioPath}`);
          };

          this.audioCache.set(audioPath, audio);
        } catch (e) {
          console.warn(`[SoundService] Failed to create audio for ${audioPath}:`, e);
        }
      }
    });
  }

  /**
   * 获取或创建 Audio 对象
   */
  private getAudio(soundFile: string): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;

    const audioPath = `${AUDIO_PATH_PREFIX}${soundFile}`;

    if (!this.audioCache.has(audioPath)) {
      try {
        const settings = getNotificationSettings();
        const audio = new Audio(audioPath);
        audio.volume = settings.volume;
        this.audioCache.set(audioPath, audio);
      } catch (e) {
        console.warn(`[SoundService] Failed to create audio:`, e);
        return null;
      }
    }

    return this.audioCache.get(audioPath) || null;
  }

  /**
   * 检查是否在冷却中
   */
  isInCooldown(type: SoundNotificationType): boolean {
    const lastPlayed = this.lastPlayedTime.get(type) || 0;
    const config = SOUND_CONFIGS[type];
    const cooldown = config?.cooldown || 2000;
    return Date.now() - lastPlayed < cooldown;
  }

  /**
   * 播放提示音
   */
  async playSound(type: SoundNotificationType): Promise<boolean> {
    const settings = getNotificationSettings();

    if (!settings.soundEnabled) {
      return false;
    }

    const config = SOUND_CONFIGS[type];
    if (!config) {
      console.warn(`[SoundService] Unknown notification type: ${type}`);
      return false;
    }

    const audio = this.getAudio(config.soundFile);
    if (!audio) {
      return false;
    }

    try {
      // 更新音量
      audio.volume = settings.volume;

      // 重置播放位置
      audio.currentTime = 0;

      // 播放
      await audio.play();
      return true;
    } catch (err) {
      // 浏览器自动播放策略可能阻止播放
      console.warn('[SoundService] Failed to play sound:', (err as Error).message);
      return false;
    }
  }

  /**
   * 获取本地化的 TTS 文本
   */
  private getLocalizedTts(type: SoundNotificationType): string {
    const i18nKey = TTS_I18N_KEYS[type];

    try {
      const i18n = getI18n();
      const text = i18n.t(i18nKey);

      // 如果翻译返回的是 key 本身，说明没有找到翻译
      if (text === i18nKey) {
        return TTS_DEFAULT_TEXT[type];
      }

      return text;
    } catch {
      return TTS_DEFAULT_TEXT[type];
    }
  }

  /**
   * 获取 TTS 语言代码
   */
  private getTtsLang(): string {
    try {
      const i18n = getI18n();
      const locale = i18n.language || 'en';
      return LANG_MAP[locale] || 'en-US';
    } catch {
      return 'en-US';
    }
  }

  /**
   * 获取最佳可用语音
   */
  private getBestVoice(lang: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      return null;
    }

    // 获取该语言的优先语音列表
    const preferences = VOICE_PREFERENCES[lang] || [];

    // 按优先级查找语音
    for (const prefName of preferences) {
      const voice = voices.find(v => v.name.includes(prefName) || v.voiceURI.includes(prefName));
      if (voice) {
        console.log(`[SoundService] Selected voice: ${voice.name}`);
        return voice;
      }
    }

    // 回退：查找匹配语言的任意语音
    const langPrefix = lang.split('-')[0];
    const langVoice = voices.find(v => v.lang.startsWith(langPrefix));
    if (langVoice) {
      console.log(`[SoundService] Fallback voice: ${langVoice.name}`);
      return langVoice;
    }

    return null;
  }

  /**
   * TTS 语音播报（智能语音选择）
   */
  speak(text: string): boolean {
    if (typeof window === 'undefined') return false;

    if (!('speechSynthesis' in window)) {
      console.warn('[SoundService] Speech synthesis not supported');
      return false;
    }

    const settings = getNotificationSettings();
    if (!settings.ttsEnabled) {
      return false;
    }

    // 取消之前的播报
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const lang = this.getTtsLang();
    utterance.lang = lang;
    utterance.rate = 1.1; // 稍快的语速
    utterance.volume = settings.volume;

    // 智能选择最佳语音
    const bestVoice = this.getBestVoice(lang);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  }

  /**
   * 统一通知入口
   */
  async notify(
    type: SoundNotificationType,
    options: {
      roomId?: string;
      customTts?: string;
      forceTts?: boolean;
    } = {}
  ): Promise<boolean> {
    const { roomId, customTts, forceTts = false } = options;
    const settings = getNotificationSettings();
    const store = useNotificationStore.getState();

    // 检查是否启用
    if (!settings.soundEnabled) {
      return false;
    }

    // 检查是否在当前房间
    if (roomId && roomId === store.currentRoomId) {
      return false;
    }

    // 检查冷却时间
    if (this.isInCooldown(type)) {
      return false;
    }

    // 播放提示音
    const played = await this.playSound(type);
    if (played) {
      this.lastPlayedTime.set(type, Date.now());
    }

    // TTS 播报
    if ((settings.ttsEnabled || forceTts) && played) {
      const ttsText = customTts || this.getLocalizedTts(type);
      if (ttsText) {
        // 延迟播报，让提示音先响
        setTimeout(() => {
          this.speak(ttsText);
        }, 300);
      }
    }

    return played;
  }

  /**
   * 聊天消息通知
   */
  notifyChatMessage(roomId?: string, isOrderChat = false): Promise<boolean> {
    const type: SoundNotificationType = isOrderChat ? 'order_chat' : 'chat_message';
    return this.notify(type, { roomId });
  }

  /**
   * 订单通知
   */
  notifyOrder(orderType: string): Promise<boolean> {
    const typeMap: Record<string, SoundNotificationType> = {
      'order.created': 'new_order',
      'order.payment_received': 'payment',
      'order.funded': 'payment',
      'payment.locked': 'payment',
      'dispute.opened': 'dispute',
      'dispute.case_open': 'dispute',
      'dispute.case_update': 'dispute',
      'dispute.closed': 'dispute',
      'dispute.accepted': 'dispute',
      'order.vendor_finalized': 'dispute',
      'order.refunded': 'dispute',
      'order.completed': 'order_complete',
      'order.fulfilled': 'order_complete',
    };

    const soundType = typeMap[orderType];
    if (soundType) {
      return this.notify(soundType);
    }

    return Promise.resolve(false);
  }

  /**
   * 测试播放
   */
  async testPlay(type: SoundNotificationType = 'chat_message'): Promise<void> {
    const settings = getNotificationSettings();

    // 绕过冷却时间直接播放
    const config = SOUND_CONFIGS[type];
    if (config) {
      const audio = this.getAudio(config.soundFile);
      if (audio) {
        audio.volume = settings.volume;
        audio.currentTime = 0;
        await audio.play().catch(() => {});

        // 使用 TTS
        if (settings.ttsEnabled) {
          const ttsText = this.getLocalizedTts(type);
          if (ttsText) {
            setTimeout(() => this.speak(ttsText), 300);
          }
        }
      }
    }
  }

  /**
   * 更新所有缓存音频的音量
   */
  updateVolume(volume: number): void {
    this.audioCache.forEach(audio => {
      audio.volume = volume;
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.audioCache.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.audioCache.clear();
    this.lastPlayedTime.clear();
    this.initialized = false;
  }
}

// ============ 单例导出 ============

/** 声音服务单例 */
export const soundService = new SoundService();

/** 初始化声音服务 */
export function initSoundService(): void {
  soundService.init();
}

/** 播放通知声音 */
export function playNotificationSound(type: SoundNotificationType): Promise<boolean> {
  return soundService.notify(type);
}

/** 测试播放 */
export function testNotificationSound(type?: SoundNotificationType): Promise<void> {
  return soundService.testPlay(type);
}

export default soundService;
