/**
 * SectionRenderer — PG-201 (Server Component)
 *
 * Iterates over StoreConfig.sections and renders each visible section
 * through SectionSwitch → concrete Section component.
 */

import type { StoreSection } from '@mobazha/core';
import type { UserProfile } from '@mobazha/core';
import { SectionBlock } from './SectionBlock';
import { HeroSection } from './sections/HeroSection';
import { AnnouncementBarSection } from './sections/AnnouncementBarSection';
import { FeaturedProductsSection } from './sections/FeaturedProductsSection';
import { ProductGridSection } from './sections/ProductGridSection';
import { TrustBadgesSection } from './sections/TrustBadgesSection';
import { StoreTabsSection } from './sections/StoreTabsSection';

// P1/P2 sections — lazy loaded in Phase 5

interface SectionRendererProps {
  sections: StoreSection[];
  profile?: UserProfile;
  peerId: string;
}

export function SectionRenderer({ sections, profile, peerId }: SectionRendererProps) {
  const visible = sections.filter(s => s.visible);
  if (visible.length === 0) return null;

  return (
    <div className="store-sections">
      {visible.map(section => (
        <SectionBlock key={section.id} layout={section.layout}>
          <SectionSwitch section={section} profile={profile} peerId={peerId} />
        </SectionBlock>
      ))}
    </div>
  );
}

function SectionSwitch({
  section,
  profile,
  peerId,
}: {
  section: StoreSection;
  profile?: UserProfile;
  peerId: string;
}) {
  switch (section.type) {
    case 'hero':
      return <HeroSection {...section.props} profile={profile} />;
    case 'announcement-bar':
      return <AnnouncementBarSection {...section.props} sectionId={section.id} />;
    case 'featured-products':
      return <FeaturedProductsSection {...section.props} peerId={peerId} />;
    case 'product-grid':
      return <ProductGridSection {...section.props} peerId={peerId} />;
    case 'trust-badges':
      return <TrustBadgesSection {...section.props} />;
    case 'store-tabs':
      return <StoreTabsSection {...section.props} peerId={peerId} />;
    // P1/P2 sections will be added in Phase 5
    case 'about':
    case 'testimonials':
    case 'faq':
    case 'collections':
    case 'gallery':
    case 'rich-text':
    case 'contact':
      return (
        <div className="py-8 text-center text-sm opacity-50">[{section.type}] Coming soon</div>
      );
    default:
      return null;
  }
}
