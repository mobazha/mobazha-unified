const RAIL_COLLAPSED_KEY = 'mobazha.workspace.railCollapsed';
const FOCUS_MODE_KEY = 'mobazha.workspace.focusMode';

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore quota / private mode
  }
}

export function getWorkspaceRailCollapsed(): boolean {
  return readFlag(RAIL_COLLAPSED_KEY);
}

export function setWorkspaceRailCollapsed(value: boolean): void {
  writeFlag(RAIL_COLLAPSED_KEY, value);
}

export function getWorkspaceFocusMode(): boolean {
  return readFlag(FOCUS_MODE_KEY);
}

export function setWorkspaceFocusMode(value: boolean): void {
  writeFlag(FOCUS_MODE_KEY, value);
}

export function scrollToWorkspaceChatPanel(): void {
  if (typeof document === 'undefined') return;
  document.getElementById('workspace-chat-panel')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
