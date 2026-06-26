/** True when AI models page was opened from Settings (not AI Workbench). */
export function isAiModelsFromSettings(pathname: string, fromSettings: boolean): boolean {
  return pathname.startsWith('/admin/ai/models') && fromSettings;
}

export function isAdminNavItemActive(
  href: string,
  pathname: string,
  itemId: string,
  fromSettings: boolean
): boolean {
  const aiModelsFromSettings = isAiModelsFromSettings(pathname, fromSettings);

  if (href === '/admin') {
    return pathname === '/admin';
  }

  if (itemId === 'ai-workspace' || href === '/admin/ai/workspace') {
    if (aiModelsFromSettings) {
      return false;
    }
    return pathname.startsWith('/admin/ai/');
  }

  if (href === '/admin/settings') {
    return pathname === href || pathname.startsWith(`${href}/`) || aiModelsFromSettings;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
