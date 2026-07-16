/**
 * Store Branding Config — PG-201
 *
 * Section-based store customization driven by JSON config.
 * Design doc: docs/features/PG-201_STORE_BRANDING_DESIGN.md (v2.1)
 */

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export type ThemePalette =
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'midnight'
  | 'minimal'
  | 'earth'
  | 'lavender'
  | 'rose'
  | 'custom';

export type FontFamily =
  | 'inter'
  | 'dm-sans'
  | 'space-grotesk'
  | 'playfair'
  | 'lora'
  | 'merriweather'
  | 'josefin-sans'
  | 'poppins';

export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';
export type HeaderStyle = 'minimal' | 'classic' | 'hero';

export interface StoreTheme {
  palette: ThemePalette | string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  // Role tokens (PG-203): each names a *place* colors land, not another accent.
  // All optional — absent means "inherit the app theme", which is what every
  // config published before these existed already does.
  /** Page background behind all sections. */
  backgroundColor?: string;
  /** Body text on the page background. */
  textColor?: string;
  /** Card/panel background used by sections that draw raised surfaces. */
  surfaceColor?: string;
  fontFamily: FontFamily;
  borderRadius: BorderRadius;
  headerStyle: HeaderStyle;
}

// ---------------------------------------------------------------------------
// Section Layout (shared by all sections)
// ---------------------------------------------------------------------------

export type SpacingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface SectionLayout {
  paddingTop: SpacingSize;
  paddingBottom: SpacingSize;
  backgroundColor?: string;
  fullWidth?: boolean;
}

// ---------------------------------------------------------------------------
// Section Props
// ---------------------------------------------------------------------------

export interface HeroSectionProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  overlayOpacity?: number;
  height: 'sm' | 'md' | 'lg' | 'full';
  textAlign: 'left' | 'center' | 'right';
}

export interface AnnouncementBarProps {
  text: string;
  link?: string;
  dismissible: boolean;
  backgroundColor?: string;
}

export interface FeaturedProductsProps {
  title: string;
  mode: 'manual' | 'newest' | 'popular';
  productSlugs?: string[];
  count: number;
  columns: 2 | 3 | 4;
}

export interface ProductGridProps {
  title?: string;
  showFilters: boolean;
  showSearch: boolean;
  columns: 2 | 3 | 4;
  sortDefault: 'newest' | 'price-asc' | 'price-desc' | 'name';
}

export interface AboutSectionProps {
  title: string;
  text: string;
  image?: string;
  imagePosition: 'left' | 'right';
  showContactInfo: boolean;
}

export interface TrustBadge {
  icon: 'escrow' | 'crypto' | 'selfHosted' | 'p2p' | 'privacy' | 'custom';
  title: string;
  description: string;
  customIcon?: string;
}

export interface TrustBadgesProps {
  badges: TrustBadge[];
  layout: 'horizontal' | 'grid';
  style: 'minimal' | 'card' | 'illustrated';
}

export interface TestimonialsProps {
  title: string;
  mode: 'manual' | 'latest';
  items?: Array<{ name: string; text: string; rating?: number; avatar?: string }>;
  count?: number;
}

export interface FaqSectionProps {
  title: string;
  items: Array<{ question: string; answer: string }>;
}

export interface CollectionsSectionProps {
  title: string;
  mode: 'all' | 'manual';
  collectionIDs?: string[];
  layout: 'carousel' | 'grid';
  columns?: 2 | 3 | 4;
}

export interface GallerySectionProps {
  title?: string;
  images: Array<{ src: string; alt?: string; link?: string; caption?: string }>;
  columns: 2 | 3 | 4;
  aspectRatio: 'square' | '4:3' | '16:9' | 'auto';
  enableLightbox: boolean;
}

export interface RichTextSectionProps {
  content: string;
  maxWidth: 'sm' | 'md' | 'lg' | 'full';
}

export interface ContactSectionProps {
  title: string;
  showEmail: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  showSocial: boolean;
  customMessage?: string;
}

export interface StoreTabsProps {
  tabs: Array<'reviews' | 'following' | 'followers'>;
}

export interface VideoSectionProps {
  title?: string;
  videoUrl: string;
  posterImage?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  aspectRatio?: '16:9' | '4:3' | '1:1';
}

export interface CountdownSectionProps {
  title?: string;
  targetDate: string;
  endMessage?: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
}

// ---------------------------------------------------------------------------
// Discriminated Union — type field determines props type
// ---------------------------------------------------------------------------

/**
 * Common shape shared by every section variant. `name` is an optional
 * seller-chosen label shown in the editor section list (PG-203) so two
 * sections of the same type can be told apart.
 */
interface SectionOf<TType extends string, TProps> {
  id: string;
  type: TType;
  props: TProps;
  visible: boolean;
  layout?: SectionLayout;
  name?: string;
}

export type StoreSection =
  | SectionOf<'hero', HeroSectionProps>
  | SectionOf<'announcement-bar', AnnouncementBarProps>
  | SectionOf<'featured-products', FeaturedProductsProps>
  | SectionOf<'product-grid', ProductGridProps>
  | SectionOf<'about', AboutSectionProps>
  | SectionOf<'trust-badges', TrustBadgesProps>
  | SectionOf<'testimonials', TestimonialsProps>
  | SectionOf<'faq', FaqSectionProps>
  | SectionOf<'collections', CollectionsSectionProps>
  | SectionOf<'gallery', GallerySectionProps>
  | SectionOf<'rich-text', RichTextSectionProps>
  | SectionOf<'contact', ContactSectionProps>
  | SectionOf<'store-tabs', StoreTabsProps>
  | SectionOf<'video', VideoSectionProps>
  | SectionOf<'countdown', CountdownSectionProps>;

export type SectionType = StoreSection['type'];

// ---------------------------------------------------------------------------
// StoreConfig (top-level)
// ---------------------------------------------------------------------------

export interface StoreConfig {
  version: 1;
  status: 'draft' | 'published';
  theme: StoreTheme;
  sections: StoreSection[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_SECTIONS = 20;

export const WEB3_TRUST_KIT: TrustBadge[] = [
  {
    icon: 'escrow',
    title: 'Buyer Protection',
    description: 'Funds held securely until you confirm receipt',
  },
  {
    icon: 'crypto',
    title: 'Crypto Native',
    description: 'Pay with ETH, BNB, SOL and more',
  },
  {
    icon: 'selfHosted',
    title: 'Self-Hosted',
    description: "This store runs on the seller's own server",
  },
  {
    icon: 'p2p',
    title: 'Direct Trade',
    description: 'No middleman between you and the seller',
  },
  {
    icon: 'privacy',
    title: 'Privacy First',
    description: 'No tracking, no data harvesting',
  },
];

export const SECTION_TYPE_LIST: SectionType[] = [
  'hero',
  'announcement-bar',
  'featured-products',
  'product-grid',
  'about',
  'trust-badges',
  'testimonials',
  'faq',
  'collections',
  'gallery',
  'rich-text',
  'contact',
  'video',
  'countdown',
  'store-tabs',
];

/** Section types that cannot be added manually via the editor picker */
export const SYSTEM_SECTION_TYPES: SectionType[] = [];

/** Section types available in the "Add Section" picker */
export const ADDABLE_SECTION_TYPES = SECTION_TYPE_LIST.filter(
  t => !SYSTEM_SECTION_TYPES.includes(t)
);
