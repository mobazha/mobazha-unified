'use client';

import { useParams } from 'next/navigation';
import { MarketplaceDetailPageContent } from '@/components/CommunityMarketplace/MarketplaceDetailPageContent';

export default function MarketplaceDetailPage() {
  const params = useParams();
  const slugParam = params.slug;
  const identifier = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!identifier) {
    return null;
  }

  return <MarketplaceDetailPageContent identifier={identifier} />;
}
