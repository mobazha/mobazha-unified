/**
 * Default Store Config & Presets — PG-201
 *
 * Provides DEFAULT_STORE_CONFIG for stores without custom branding,
 * and 5 ready-made presets for quick setup.
 */

import type { StoreConfig, StoreTheme, StoreSection } from '@mobazha/core';
import { WEB3_TRUST_KIT } from '@mobazha/core';

// ---------------------------------------------------------------------------
// Default Section Layout
// ---------------------------------------------------------------------------

const defaultSections: StoreSection[] = [
  {
    id: 'default-hero',
    type: 'hero',
    props: {
      title: 'Welcome',
      subtitle: 'Explore our collection',
      height: 'md',
      textAlign: 'center',
      overlayOpacity: 0.4,
    },
    visible: true,
  },
  {
    id: 'default-featured',
    type: 'featured-products',
    props: {
      title: 'Featured Products',
      mode: 'newest',
      count: 4,
      columns: 4,
    },
    visible: true,
  },
  {
    id: 'default-trust',
    type: 'trust-badges',
    props: {
      badges: [...WEB3_TRUST_KIT],
      layout: 'horizontal',
      style: 'card',
    },
    visible: true,
  },
  {
    id: 'default-store-tabs',
    type: 'store-tabs',
    props: { tabs: ['reviews', 'following', 'followers'] },
    visible: true,
  },
];

const defaultTheme: StoreTheme = {
  palette: 'minimal',
  primaryColor: '#000000',
  secondaryColor: '#6b7280',
  accentColor: '#9ca3af',
  fontFamily: 'inter',
  borderRadius: 'md',
  headerStyle: 'minimal',
};

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  version: 1,
  status: 'published',
  theme: defaultTheme,
  sections: defaultSections,
};

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface StorePreset {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  config: StoreConfig;
}

export const STORE_PRESETS: StorePreset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple — let your products speak',
    config: DEFAULT_STORE_CONFIG,
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Professional blue tones with serif headings',
    config: {
      version: 1,
      status: 'published',
      theme: {
        palette: 'ocean',
        primaryColor: '#1a3a5c',
        secondaryColor: '#4a9eda',
        accentColor: '#72c4ff',
        fontFamily: 'playfair',
        borderRadius: 'md',
        headerStyle: 'hero',
      },
      sections: [
        {
          id: 'ocean-hero',
          type: 'hero',
          props: {
            title: 'Discover Something Special',
            subtitle: 'Curated products for discerning buyers',
            height: 'lg',
            textAlign: 'center',
            overlayOpacity: 0.5,
          },
          visible: true,
        },
        {
          id: 'ocean-featured',
          type: 'featured-products',
          props: { title: 'Staff Picks', mode: 'manual', count: 3, columns: 3 },
          visible: true,
        },
        {
          id: 'ocean-about',
          type: 'about',
          props: {
            title: 'Our Story',
            text: 'Share your brand narrative here...',
            imagePosition: 'right',
            showContactInfo: true,
          },
          visible: true,
        },
        {
          id: 'ocean-trust',
          type: 'trust-badges',
          props: { badges: [...WEB3_TRUST_KIT], layout: 'horizontal', style: 'illustrated' },
          visible: true,
        },
        {
          id: 'ocean-tabs',
          type: 'store-tabs',
          props: { tabs: ['reviews', 'following', 'followers'] },
          visible: true,
        },
      ],
    },
  },
  {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural earthy tones, great for organic or handmade goods',
    config: {
      version: 1,
      status: 'published',
      theme: {
        palette: 'forest',
        primaryColor: '#2d4a22',
        secondaryColor: '#6b8f5e',
        accentColor: '#a3c585',
        fontFamily: 'lora',
        borderRadius: 'lg',
        headerStyle: 'classic',
      },
      sections: [
        {
          id: 'forest-announce',
          type: 'announcement-bar',
          props: {
            text: '🌿 All products are ethically sourced',
            dismissible: false,
          },
          visible: true,
        },
        {
          id: 'forest-hero',
          type: 'hero',
          props: {
            title: 'Handcrafted with Care',
            subtitle: 'Every piece tells a story',
            height: 'md',
            textAlign: 'left',
            overlayOpacity: 0.3,
          },
          visible: true,
        },
        {
          id: 'forest-collections',
          type: 'collections',
          props: { title: 'Browse Collections', mode: 'all', layout: 'carousel' },
          visible: true,
        },
        {
          id: 'forest-trust',
          type: 'trust-badges',
          props: { badges: [...WEB3_TRUST_KIT], layout: 'grid', style: 'minimal' },
          visible: true,
        },
        {
          id: 'forest-tabs',
          type: 'store-tabs',
          props: { tabs: ['reviews', 'following', 'followers'] },
          visible: true,
        },
      ],
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Warm',
    description: 'Warm, inviting colors — perfect for lifestyle brands',
    config: {
      version: 1,
      status: 'published',
      theme: {
        palette: 'sunset',
        primaryColor: '#c0533a',
        secondaryColor: '#e8845a',
        accentColor: '#f5b07c',
        fontFamily: 'poppins',
        borderRadius: 'lg',
        headerStyle: 'hero',
      },
      sections: [
        {
          id: 'sunset-hero',
          type: 'hero',
          props: {
            title: 'Shop the Vibe',
            subtitle: 'Bold picks for bold people',
            height: 'lg',
            textAlign: 'center',
            overlayOpacity: 0.35,
          },
          visible: true,
        },
        {
          id: 'sunset-grid',
          type: 'product-grid',
          props: {
            showFilters: true,
            showSearch: true,
            columns: 3,
            sortDefault: 'newest' as const,
          },
          visible: true,
        },
        {
          id: 'sunset-testimonials',
          type: 'testimonials',
          props: { title: 'Loved by Our Community', mode: 'latest', count: 4 },
          visible: true,
        },
        {
          id: 'sunset-tabs',
          type: 'store-tabs',
          props: { tabs: ['reviews', 'following', 'followers'] },
          visible: true,
        },
      ],
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    description: 'Dark, luxurious aesthetic for premium or digital goods',
    config: {
      version: 1,
      status: 'published',
      theme: {
        palette: 'midnight',
        primaryColor: '#2b1e5e',
        secondaryColor: '#5c4d9a',
        accentColor: '#8b7fd4',
        fontFamily: 'space-grotesk',
        borderRadius: 'sm',
        headerStyle: 'minimal',
      },
      sections: [
        {
          id: 'midnight-hero',
          type: 'hero',
          props: {
            title: 'Next-Gen Digital Goods',
            subtitle: 'Powered by Web3',
            height: 'md',
            textAlign: 'center',
            overlayOpacity: 0.6,
          },
          visible: true,
        },
        {
          id: 'midnight-featured',
          type: 'featured-products',
          props: { title: 'Top Sellers', mode: 'popular', count: 4, columns: 4 },
          visible: true,
        },
        {
          id: 'midnight-faq',
          type: 'faq',
          props: {
            title: 'FAQ',
            items: [
              {
                question: 'What payment methods do you accept?',
                answer: 'ETH, BNB, SOL, and more.',
              },
              {
                question: 'Is there buyer protection?',
                answer: 'Yes, all purchases are secured by escrow.',
              },
            ],
          },
          visible: true,
        },
        {
          id: 'midnight-tabs',
          type: 'store-tabs',
          props: { tabs: ['reviews', 'following', 'followers'] },
          visible: true,
        },
      ],
    },
  },
];
