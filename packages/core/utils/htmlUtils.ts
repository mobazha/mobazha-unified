/**
 * HTML 处理工具函数
 * 使用 DOMPurify 安全地处理 HTML 内容
 */

import DOMPurify from 'isomorphic-dompurify';
import type { Config } from 'dompurify';

// 基础标签：用于商品描述、用户简介等一般 HTML 内容
const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'b',
    'i',
    'strong',
    'em',
    'u',
    'a',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'code',
    'pre',
    'span',
    'div',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ADD_ATTR: ['target', 'rel'],
};

// 扩展标签：用于 Store Section 富文本（含图片、表格、删除线等）
const RICH_HTML_CONFIG: Config = {
  ALLOWED_TAGS: [
    ...SANITIZE_CONFIG.ALLOWED_TAGS!,
    's',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'width', 'height'],
  ADD_ATTR: ['target', 'rel'],
};

// 添加钩子为链接添加安全属性
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
}

/**
 * HTML 实体解码
 * 将 HTML 实体（如 &amp; &lt; 等）转换为对应的字符
 */
export function decodeHtmlEntities(text: string): string {
  if (typeof window === 'undefined') {
    // SSR 环境下的简单解码
    return text
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * 安全的 HTML 消毒函数
 * 使用 DOMPurify 只允许基本的格式化标签，移除危险的标签和属性
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

/**
 * 富文本 HTML 消毒函数
 * 允许更多标签（img、table、s 等），用于 Store Section 富文本编辑器内容
 */
export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, RICH_HTML_CONFIG);
}

/**
 * 剥离所有 HTML 标签，只保留纯文本
 * 适用于不需要显示 HTML 格式的场景（如简短描述）
 */
export function stripHtmlTags(html: string): string {
  // 使用 DOMPurify 移除所有标签
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}
