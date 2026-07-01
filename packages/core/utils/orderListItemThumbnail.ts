/**
 * Order list API returns thumbnail as either a single CID/hash string or a full Image object.
 * Centralize parsing so admin / dashboard UI matches product list behavior.
 */

import type { Image } from '../types/common';
import type { OrderListItem } from '../types/order';
import { getImageUrl } from '../services/api/config';

function resolveThumbnailHash(thumbnail: Image | string | undefined | null): string {
  if (thumbnail === undefined || thumbnail === null) return '';
  if (typeof thumbnail === 'string') {
    return thumbnail.trim();
  }
  const hash =
    thumbnail.medium ||
    thumbnail.small ||
    thumbnail.tiny ||
    thumbnail.large ||
    thumbnail.original ||
    '';
  return typeof hash === 'string' ? hash.trim() : '';
}

/** Raw hash/CID (for storage or passing to getImageUrl elsewhere). */
export function orderListItemThumbnailHash(item: Pick<OrderListItem, 'thumbnail'>): string {
  return resolveThumbnailHash(item.thumbnail as Image | string | undefined);
}

/** Resolved display URL for order list rows. */
export function orderListItemThumbnailDisplayUrl(
  item: Pick<OrderListItem, 'thumbnail' | 'vendorID'>
): string {
  const hash = resolveThumbnailHash(item.thumbnail as Image | string | undefined);
  if (!hash) return '';
  const vid = item.vendorID?.trim();
  return getImageUrl(hash, vid || undefined) || '';
}
