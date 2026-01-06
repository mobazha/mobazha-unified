/**
 * Matrix 事件发射器
 * 跨平台事件处理
 */

import type { MatrixEventType, MatrixEventListener } from './types';

type ListenerMap = Map<MatrixEventType, Set<MatrixEventListener>>;

class MatrixEventEmitter {
  private listeners: ListenerMap = new Map();

  /**
   * 添加事件监听器
   */
  on(event: MatrixEventType, listener: MatrixEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // 返回取消订阅函数
    return () => this.off(event, listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: MatrixEventType, listener: MatrixEventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * 触发事件
   */
  emit(event: MatrixEventType, data?: unknown): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[Matrix] Event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 一次性监听
   */
  once(event: MatrixEventType, listener: MatrixEventListener): () => void {
    const onceWrapper: MatrixEventListener = data => {
      this.off(event, onceWrapper);
      listener(data);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: MatrixEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// 单例
export const matrixEvents = new MatrixEventEmitter();
