/**
 * React Query 内部工具函数
 */

/**
 * 将 unknown error 转为 string | null，供 hook 返回值使用。
 * UI 层拿到 string 后再决定是否 i18n 或直接展示。
 */
export function formatQueryError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return String(error);
}
