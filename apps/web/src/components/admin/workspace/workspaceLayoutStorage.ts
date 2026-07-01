const RAIL_COLLAPSED_KEY = 'mobazha.workspace.railCollapsed';
const FOCUS_MODE_KEY = 'mobazha.workspace.focusMode';
const SESSION_RAIL_COLLAPSED_KEY = 'mobazha.workspace.sessionRailCollapsed';

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
  if (typeof window === 'undefined') return true;
  try {
    const value = window.localStorage.getItem(RAIL_COLLAPSED_KEY);
    if (value === null) return true;
    return value === '1';
  } catch {
    return true;
  }
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

export function getWorkspaceSessionRailCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const value = window.localStorage.getItem(SESSION_RAIL_COLLAPSED_KEY);
    if (value === null) return false;
    return value === '1';
  } catch {
    return false;
  }
}

export function setWorkspaceSessionRailCollapsed(value: boolean): void {
  writeFlag(SESSION_RAIL_COLLAPSED_KEY, value);
}

export function scrollToWorkspaceChatPanel(): void {
  if (typeof document === 'undefined') return;
  document.getElementById('workspace-chat-panel')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
