/** Mirror of node generateSessionTitle for optimistic session list labels. */
export function deriveChatSessionTitle(message: string, maxLen = 80): string {
  const s = message
    .trim()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!s) return '';
  if (s.length <= maxLen) return s;

  let truncated = s.slice(0, maxLen);
  const breakChars = ' ,.;!?。，；！？';
  let breakIdx = -1;
  for (let i = truncated.length - 1; i > 40; i--) {
    if (breakChars.includes(truncated[i])) {
      breakIdx = i;
      break;
    }
  }
  if (breakIdx > 40) {
    truncated = truncated.slice(0, breakIdx);
  }
  return `${truncated}...`;
}

export function sessionDisplayTitle(
  title: string | undefined,
  fallback: string,
  firstMessage?: string
): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  const derived = firstMessage ? deriveChatSessionTitle(firstMessage) : '';
  if (derived) return derived;
  return fallback;
}
