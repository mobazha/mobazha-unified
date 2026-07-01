export type OrderListRole = 'purchases' | 'sales';
export type OrderDetailRole = 'purchase' | 'sale';
export type OrdersShell = 'consumer' | 'admin';
export type OrderSourceFilter = 'all' | 'standard' | 'guest';

/** URL `status` values supported by OrdersSalesPanel (matches ActionItems + status tabs). */
export type OrderListStatusFilter =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'disputed'
  | 'cancelled';

const ORDER_LIST_STATUS_FILTERS: readonly OrderListStatusFilter[] = [
  'pending',
  'processing',
  'shipped',
  'completed',
  'disputed',
  'cancelled',
];

const ORDER_SOURCE_FILTERS: readonly OrderSourceFilter[] = ['all', 'standard', 'guest'];

export function parseOrderListRole(
  searchParams: URLSearchParams,
  defaultRole: OrderListRole
): OrderListRole {
  const role = searchParams.get('role');
  if (role === 'purchases' || role === 'sales') {
    return role;
  }
  return defaultRole;
}

export function parseOrderListStatusFilter(
  searchParams: URLSearchParams
): OrderListStatusFilter | null {
  const status = searchParams.get('status');
  if (status && ORDER_LIST_STATUS_FILTERS.includes(status as OrderListStatusFilter)) {
    return status as OrderListStatusFilter;
  }
  return null;
}

export function parseOrderSourceFilter(searchParams: URLSearchParams): OrderSourceFilter | null {
  const source = searchParams.get('source');
  if (source && ORDER_SOURCE_FILTERS.includes(source as OrderSourceFilter)) {
    return source as OrderSourceFilter;
  }
  return null;
}

export function parseGuestOrderToken(searchParams: URLSearchParams): string | null {
  const token = searchParams.get('guestOrder');
  return token?.trim() || null;
}

export function parseOrderDetailRole(searchParams: URLSearchParams): OrderDetailRole | undefined {
  const role = searchParams.get('role');
  if (role === 'purchase' || role === 'sale') {
    return role;
  }
  const legacyType = searchParams.get('type');
  if (legacyType === 'purchase' || legacyType === 'sale') {
    return legacyType;
  }
  return undefined;
}

export function ordersListPath(shell: OrdersShell, role: OrderListRole): string {
  if (shell === 'admin') {
    return role === 'sales' ? '/admin/orders' : '/admin/orders?role=purchases';
  }
  return role === 'purchases' ? '/orders' : '/orders?role=sales';
}

/** Base path for the sales-side order list (preserves consumer `role=sales`). */
export function ordersSalesListBasePath(shell: OrdersShell): string {
  return ordersListPath(shell, 'sales').split('?')[0] ?? '/admin/orders';
}

/**
 * Patch list-page query params. `source=all` and `status=all` remove the param
 * so the default view is a clean `/admin/orders` URL.
 */
export function patchOrderListSearchParams(
  current: URLSearchParams,
  patch: {
    source?: OrderSourceFilter;
    status?: OrderListStatusFilter | 'all';
    guestOrder?: string | null;
  }
): URLSearchParams {
  const params = new URLSearchParams(current.toString());

  if (patch.source !== undefined) {
    if (patch.source === 'all') {
      params.delete('source');
    } else {
      params.set('source', patch.source);
    }
  }

  if (patch.status !== undefined) {
    if (patch.status === 'all') {
      params.delete('status');
    } else {
      params.set('status', patch.status);
    }
  }

  if (patch.guestOrder !== undefined) {
    if (!patch.guestOrder) {
      params.delete('guestOrder');
    } else {
      params.set('guestOrder', patch.guestOrder);
    }
  }

  return params;
}

export function orderListSearchPath(shell: OrdersShell, params: URLSearchParams): string {
  const base = ordersSalesListBasePath(shell);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function guestOrderAdminPath(orderToken: string): string {
  const params = new URLSearchParams({
    source: 'guest',
    guestOrder: orderToken,
  });
  return `/admin/orders?${params.toString()}`;
}

export type OrderDetailPathOptions = {
  /** Preserve admin purchases list as back target (`from=admin`). */
  fromShell?: OrdersShell;
  /** Detail sub-tab (discussion / dispute / evidence). */
  tab?: string;
};

export function orderDetailPath(
  orderId: string,
  detailRole: OrderDetailRole,
  options?: OrderDetailPathOptions
): string {
  const params = new URLSearchParams({ role: detailRole });
  if (options?.fromShell === 'admin' && detailRole === 'purchase') {
    params.set('from', 'admin');
  }
  if (options?.tab) {
    params.set('tab', options.tab);
  }
  return `/orders/${encodeURIComponent(orderId)}?${params.toString()}`;
}

/** List page to return to from order detail (not found / explicit back). */
export function ordersBackPath(
  searchParams: URLSearchParams,
  detailRole?: OrderDetailRole
): string {
  const role = parseOrderDetailRole(searchParams) ?? detailRole;
  if (searchParams.get('from') === 'admin' && role === 'purchase') {
    return ordersListPath('admin', 'purchases');
  }
  if (role === 'sale') {
    return ordersListPath('admin', 'sales');
  }
  return ordersListPath('consumer', 'purchases');
}

export function listRoleToDetailRole(role: OrderListRole): OrderDetailRole {
  return role === 'purchases' ? 'purchase' : 'sale';
}
