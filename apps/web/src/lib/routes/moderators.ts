/** Moderator page paths and query-aware href builders. */

export const MODERATOR_ROUTES = {
  directory: '/moderators',
  storeSettings: '/admin/settings/moderators',
  storeDirectory: '/admin/settings/moderators/find',
} as const;

export type ModeratorFlowContext = {
  intent?: 'add-to-store';
  returnTo?: string;
};

export type ModeratorBackNavLabelKey =
  | 'moderator.backToStoreSettings'
  | 'moderator.backToBrowse'
  | 'moderator.backToModerators';

function buildModeratorQuery(ctx?: ModeratorFlowContext): string {
  if (!ctx?.intent && !ctx?.returnTo) return '';
  const params = new URLSearchParams();
  if (ctx.intent) params.set('intent', ctx.intent);
  if (ctx.returnTo) params.set('returnTo', ctx.returnTo);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function isStoreSettingsReturn(returnTo: string | null | undefined): boolean {
  return Boolean(returnTo?.startsWith('/admin/settings'));
}

export function moderatorDirectoryHref(ctx?: ModeratorFlowContext): string {
  return `${MODERATOR_ROUTES.directory}${buildModeratorQuery(ctx)}`;
}

/** Directory opened from store settings to pick moderators to add. */
export function moderatorDirectoryAddFromStoreHref(
  returnTo: string = MODERATOR_ROUTES.storeSettings
): string {
  return `${MODERATOR_ROUTES.storeDirectory}${buildModeratorQuery({
    intent: 'add-to-store',
    returnTo,
  })}`;
}

export function moderatorDetailHref(peerID: string, ctx?: ModeratorFlowContext): string {
  return `/moderators/${encodeURIComponent(peerID)}${buildModeratorQuery(ctx)}`;
}

export function storeModeratorDetailHref(
  peerID: string,
  returnTo: string = MODERATOR_ROUTES.storeSettings
): string {
  return `${MODERATOR_ROUTES.storeDirectory}/${encodeURIComponent(peerID)}${buildModeratorQuery({
    intent: 'add-to-store',
    returnTo,
  })}`;
}

export function resolveModeratorBackNav(searchParams: URLSearchParams): {
  href: string;
  labelKey: ModeratorBackNavLabelKey;
} {
  const returnTo = searchParams.get('returnTo');
  const intent = searchParams.get('intent');

  if (returnTo?.startsWith('/')) {
    if (isStoreSettingsReturn(returnTo)) {
      return { href: returnTo, labelKey: 'moderator.backToStoreSettings' };
    }
    if (intent === 'add-to-store') {
      return {
        href: moderatorDirectoryAddFromStoreHref(returnTo),
        labelKey: 'moderator.backToBrowse',
      };
    }
    return { href: returnTo, labelKey: 'moderator.backToModerators' };
  }

  if (intent === 'add-to-store') {
    return {
      href: moderatorDirectoryAddFromStoreHref(),
      labelKey: 'moderator.backToBrowse',
    };
  }

  return { href: MODERATOR_ROUTES.directory, labelKey: 'moderator.backToModerators' };
}
