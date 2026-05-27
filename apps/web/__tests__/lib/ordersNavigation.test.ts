import { describe, expect, it } from 'vitest';
import {
  listRoleToDetailRole,
  guestOrderAdminPath,
  orderDetailPath,
  orderListSearchPath,
  ordersBackPath,
  ordersListPath,
  patchOrderListSearchParams,
  parseGuestOrderToken,
  parseOrderDetailRole,
  parseOrderListRole,
  parseOrderSourceFilter,
  parseOrderListStatusFilter,
} from '@/lib/ordersNavigation';

describe('ordersNavigation', () => {
  describe('parseOrderListRole', () => {
    it('reads role=purchases|sales', () => {
      expect(parseOrderListRole(new URLSearchParams('role=purchases'), 'sales')).toBe('purchases');
      expect(parseOrderListRole(new URLSearchParams('role=sales'), 'purchases')).toBe('sales');
    });

    it('falls back to default when role missing or invalid', () => {
      expect(parseOrderListRole(new URLSearchParams(), 'sales')).toBe('sales');
      expect(parseOrderListRole(new URLSearchParams('role=foo'), 'purchases')).toBe('purchases');
    });
  });

  describe('parseOrderListStatusFilter', () => {
    it('reads dashboard status query params', () => {
      expect(parseOrderListStatusFilter(new URLSearchParams('status=pending'))).toBe('pending');
      expect(parseOrderListStatusFilter(new URLSearchParams('status=disputed'))).toBe('disputed');
    });

    it('returns null for unknown status', () => {
      expect(parseOrderListStatusFilter(new URLSearchParams('status=unknown'))).toBeNull();
      expect(parseOrderListStatusFilter(new URLSearchParams())).toBeNull();
    });
  });

  describe('parseOrderSourceFilter', () => {
    it('reads guest order source filters', () => {
      expect(parseOrderSourceFilter(new URLSearchParams('source=guest'))).toBe('guest');
      expect(parseOrderSourceFilter(new URLSearchParams('source=standard'))).toBe('standard');
    });

    it('returns null for unknown source', () => {
      expect(parseOrderSourceFilter(new URLSearchParams('source=unknown'))).toBeNull();
      expect(parseOrderSourceFilter(new URLSearchParams())).toBeNull();
    });
  });

  describe('parseGuestOrderToken', () => {
    it('reads guest order token', () => {
      expect(parseGuestOrderToken(new URLSearchParams('guestOrder=gst_123'))).toBe('gst_123');
    });

    it('returns null when guest order token is empty', () => {
      expect(parseGuestOrderToken(new URLSearchParams('guestOrder='))).toBeNull();
      expect(parseGuestOrderToken(new URLSearchParams())).toBeNull();
    });
  });

  describe('parseOrderDetailRole', () => {
    it('prefers role over legacy type', () => {
      expect(parseOrderDetailRole(new URLSearchParams('role=sale&type=purchase'))).toBe('sale');
    });

    it('reads legacy type', () => {
      expect(parseOrderDetailRole(new URLSearchParams('type=purchase'))).toBe('purchase');
    });
  });

  describe('ordersListPath', () => {
    it('builds consumer and admin list URLs', () => {
      expect(ordersListPath('consumer', 'purchases')).toBe('/orders');
      expect(ordersListPath('consumer', 'sales')).toBe('/orders?role=sales');
      expect(ordersListPath('admin', 'sales')).toBe('/admin/orders');
      expect(ordersListPath('admin', 'purchases')).toBe('/admin/orders?role=purchases');
    });
  });

  describe('orderDetailPath', () => {
    it('encodes order id and sets role', () => {
      expect(orderDetailPath('QmOrder/1', 'purchase')).toBe('/orders/QmOrder%2F1?role=purchase');
    });

    it('adds from=admin for admin purchases', () => {
      expect(orderDetailPath('id', 'purchase', { fromShell: 'admin' })).toBe(
        '/orders/id?role=purchase&from=admin'
      );
    });
  });

  describe('guestOrderAdminPath', () => {
    it('builds seller guest order deep links', () => {
      expect(guestOrderAdminPath('gst_token with spaces')).toBe(
        '/admin/orders?source=guest&guestOrder=gst_token+with+spaces'
      );
    });
  });

  describe('ordersBackPath', () => {
    it('returns admin purchases when from=admin', () => {
      expect(ordersBackPath(new URLSearchParams('role=purchase&from=admin'))).toBe(
        '/admin/orders?role=purchases'
      );
    });

    it('returns admin sales for sale role', () => {
      expect(ordersBackPath(new URLSearchParams('role=sale'))).toBe('/admin/orders');
    });

    it('returns consumer purchases by default', () => {
      expect(ordersBackPath(new URLSearchParams())).toBe('/orders');
    });
  });

  describe('listRoleToDetailRole', () => {
    it('maps list roles to detail roles', () => {
      expect(listRoleToDetailRole('purchases')).toBe('purchase');
      expect(listRoleToDetailRole('sales')).toBe('sale');
    });
  });

  describe('patchOrderListSearchParams', () => {
    it('clears source and guestOrder when switching to all', () => {
      const current = new URLSearchParams('source=guest&guestOrder=gst_1&status=pending');
      const next = patchOrderListSearchParams(current, { source: 'all', guestOrder: null });
      expect(next.get('source')).toBeNull();
      expect(next.get('guestOrder')).toBeNull();
      expect(next.get('status')).toBe('pending');
    });

    it('sets source=standard without dropping other params', () => {
      const current = new URLSearchParams('source=guest&status=shipped');
      const next = patchOrderListSearchParams(current, { source: 'standard' });
      expect(next.get('source')).toBe('standard');
      expect(next.get('status')).toBe('shipped');
    });
  });

  describe('orderListSearchPath', () => {
    it('builds admin sales list URLs', () => {
      const params = new URLSearchParams('source=standard&status=pending');
      expect(orderListSearchPath('admin', params)).toBe(
        '/admin/orders?source=standard&status=pending'
      );
    });

    it('preserves consumer role=sales when patching filters', () => {
      const params = new URLSearchParams('role=sales&source=guest');
      expect(orderListSearchPath('consumer', params)).toBe('/orders?role=sales&source=guest');
    });
  });
});
