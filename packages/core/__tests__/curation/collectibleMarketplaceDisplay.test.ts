import { describe, expect, it } from 'vitest';
import {
  COLLECTIBLE_MARKETPLACE_LISTINGS_SECTION_ID,
  isM2WilsonCollectibleMarketplace,
  resolveCollectibleMarketplaceDisplayCopy,
  shouldShowCollectibleMarketplaceJoinCta,
} from '../../curation/collectibleMarketplaceDisplay';

const t = (key: string) => {
  const zhDemo: Record<string, string> = {
    'marketplace.detail.collectibles.demo.m2Wilson.name': 'M2 Wilson 评级卡策展市场',
    'marketplace.detail.collectibles.demo.m2Wilson.description': '中文演示描述',
    'marketplace.detail.collectibles.defaultDescription': '默认描述',
    'marketplace.detail.collectibles.badge': '收藏卡牌',
  };
  return zhDemo[key] ?? key;
};

describe('collectible marketplace display helpers', () => {
  it('exposes a stable listings section id for in-page scroll', () => {
    expect(COLLECTIBLE_MARKETPLACE_LISTINGS_SECTION_ID).toBe('collectible-marketplace-listings');
  });

  it('localizes M2 Wilson copy in zh without mutating API fields', () => {
    const copy = resolveCollectibleMarketplaceDisplayCopy(
      {
        slug: 'm2-wilson',
        publicID: 'mp-m2',
        name: 'M2 Wilson Sports Card Market',
        publicDescription: 'English API description',
      },
      'zh',
      t
    );

    expect(copy.usedLocalizedDemoCopy).toBe(true);
    expect(copy.name).toBe('M2 Wilson 评级卡策展市场');
    expect(copy.description).toBe('中文演示描述');
  });

  it('keeps API copy for non-demo markets', () => {
    const copy = resolveCollectibleMarketplaceDisplayCopy(
      {
        slug: 'other-market',
        publicID: 'mp-other',
        name: 'Other Market',
        publicDescription: 'Custom description',
      },
      'zh',
      t
    );

    expect(copy.usedLocalizedDemoCopy).toBe(false);
    expect(copy.name).toBe('Other Market');
    expect(copy.description).toBe('Custom description');
  });

  it('hides join CTA for native platform markets', () => {
    expect(shouldShowCollectibleMarketplaceJoinCta('native')).toBe(false);
    expect(shouldShowCollectibleMarketplaceJoinCta('telegram')).toBe(true);
    expect(shouldShowCollectibleMarketplaceJoinCta('discord')).toBe(true);
  });

  it('detects M2 Wilson marketplace identifiers', () => {
    expect(isM2WilsonCollectibleMarketplace('m2-wilson')).toBe(true);
    expect(isM2WilsonCollectibleMarketplace('M2-Wilson')).toBe(true);
    expect(isM2WilsonCollectibleMarketplace('wilson-cards')).toBe(false);
  });
});
