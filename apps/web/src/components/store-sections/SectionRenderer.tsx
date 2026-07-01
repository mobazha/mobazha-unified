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
import { AboutSection } from './sections/AboutSection';
import { FaqSection } from './sections/FaqSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { CollectionsSection } from './sections/CollectionsSection';
import { GallerySection } from './sections/GallerySection';
import { RichTextSection } from './sections/RichTextSection';
import { ContactSection } from './sections/ContactSection';
import { VideoSection } from './sections/VideoSection';
import { CountdownSection } from './sections/CountdownSection';

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
    case 'about':
      return <AboutSection {...section.props} storeHint={peerId} />;
    case 'testimonials':
      return <TestimonialsSection {...section.props} storeHint={peerId} />;
    case 'faq':
      return <FaqSection {...section.props} />;
    case 'collections':
      return <CollectionsSection {...section.props} peerId={peerId} />;
    case 'gallery':
      return <GallerySection {...section.props} storeHint={peerId} />;
    case 'rich-text':
      return <RichTextSection {...section.props} />;
    case 'contact':
      return <ContactSection {...section.props} />;
    case 'video':
      return <VideoSection {...section.props} />;
    case 'countdown':
      return <CountdownSection {...section.props} />;
    default:
      return null;
  }
}
