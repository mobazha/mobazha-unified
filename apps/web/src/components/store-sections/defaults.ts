/**
 * Default Store Config & Presets — PG-201
 *
 * Provides DEFAULT_STORE_CONFIG for stores without custom branding,
 * and 8 ready-made presets for quick setup (one per palette).
 */

import type { StoreConfig, StoreTheme, StoreSection } from '@mobazha/core';
import { WEB3_TRUST_KIT, getEditionDefaultPaymentMethodsAnswer } from '@mobazha/core';

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
      layout: 'grid',
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
  /** i18n key for preset name (e.g. 'admin.storeBranding.presetMinimal') */
  nameKey: string;
  description: string;
  /** i18n key for preset description */
  descriptionKey: string;
  thumbnail?: string;
  config: StoreConfig;
}

export const STORE_PRESETS: StorePreset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    nameKey: 'admin.storeBranding.presetMinimal',
    description: 'Clean and simple — let your products speak',
    descriptionKey: 'admin.storeBranding.presetMinimalDesc',
    config: DEFAULT_STORE_CONFIG,
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    nameKey: 'admin.storeBranding.presetOcean',
    description: 'Professional blue tones with serif headings',
    descriptionKey: 'admin.storeBranding.presetOceanDesc',
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
          props: { badges: [...WEB3_TRUST_KIT], layout: 'grid', style: 'illustrated' },
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
    nameKey: 'admin.storeBranding.presetForest',
    description: 'Natural earthy tones, great for organic or handmade goods',
    descriptionKey: 'admin.storeBranding.presetForestDesc',
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
    nameKey: 'admin.storeBranding.presetSunset',
    description: 'Warm, inviting colors — perfect for lifestyle brands',
    descriptionKey: 'admin.storeBranding.presetSunsetDesc',
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
    nameKey: 'admin.storeBranding.presetMidnight',
    description: 'Dark, luxurious aesthetic for premium or digital goods',
    descriptionKey: 'admin.storeBranding.presetMidnightDesc',
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
                answer: getEditionDefaultPaymentMethodsAnswer(),
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
  {
    id: 'earth',
    name: 'Earth Tone',
    nameKey: 'admin.storeBranding.presetEarth',
    description: 'Warm earthy tones — ideal for handmade, organic, or artisan goods',
    descriptionKey: 'admin.storeBranding.presetEarthDesc',
    config: {
      version: 1,
      status: 'published',
      theme: {
        palette: 'earth',
        primaryColor: '#8b4513',
        secondaryColor: '#c2956a',
        accentColor: '#deb887',
        fontFamily: 'merriweather',
        borderRadius: 'md',
        headerStyle: 'classic',
      },
      sections: [
        {
          id: 'earth-hero',
          type: 'hero',
          props: {
            title: 'Crafted by Nature',
            subtitle: 'Authentic products from artisan makers',
            height: 'md',
            textAlign: 'left',
            overlayOpacity: 0.35,
          },
          visible: true,
        },
        {
          id: 'earth-gallery',
          type: 'gallery',
          props: { images: [], columns: 3, aspectRatio: '4:3', enableLightbox: true },
          visible: true,
        },
        {
          id: 'earth-about',
          type: 'about',
          props: {
            title: 'Our Story',
            text: 'Share the journey behind your craft...',
            imagePosition: 'left',
            showContactInfo: true,
          },
          visible: true,
        },
        {
          id: 'earth-contact',
          type: 'contact',
          props: {
            title: 'Get in Touch',
            showEmail: true,
            showPhone: false,
            showWebsite: true,
            showSocial: true,
          },
          visible: true,
        },
        {
          id: 'earth-tabs',
          type: 'store-tabs',
          props: { tabs: ['reviews', 'following', 'followers'] },
          visible: true,
        },
      ],
    },
  },
  {
    id: 'lavender',
    name: 'Lavender Dream',
    nameKey: 'admin.storeBranding.presetLavender',
    description: 'Soft purple tones — perfect for beauty, wellness, or lifestyle brands',
    descriptionKey: 'admin.storeBranding.presetLavenderDesc',
    config: {
      version: 1,
      status: 'published',
      theme: {
        palette: 'lavender',
        primaryColor: '#6b5b95',
        secondaryColor: '#9b8dc7',
        accentColor: '#c3b7e0',
        fontFamily: 'dm-sans',
        borderRadius: 'lg',
        headerStyle: 'hero',
      },
      sections: [
        {
          id: 'lavender-hero',
          type: 'hero',
          props: {
            title: 'Glow with Confidence',
            subtitle: 'Premium beauty & wellness essentials',
            height: 'lg',
            textAlign: 'center',
            overlayOpacity: 0.4,
          },
          visible: true,
        },
        {
          id: 'lavender-featured',
          type: 'featured-products',
          props: { title: 'Best Sellers', mode: 'popular', count: 3, columns: 3 },
          visible: true,
        },
        {
          id: 'lavender-testimonials',
          type: 'testimonials',
          props: { title: 'Loved by Our Customers', mode: 'latest', count: 4 },
          visible: true,
        },
        {
          id: 'lavender-faq',
          type: 'faq',
          props: {
            title: 'Common Questions',
            items: [
              {
                question: 'Are your products cruelty-free?',
                answer: 'Yes, all our products are ethically sourced and cruelty-free.',
              },
              {
                question: 'Do you offer international shipping?',
                answer: 'Shipping details are arranged during checkout.',
              },
            ],
          },
          visible: true,
        },
        {
          id: 'lavender-tabs',
          type: 'store-tabs',
          props: { tabs: ['reviews', 'following', 'followers'] },
          visible: true,
        },
      ],
    },
  },
  {
    id: 'rose',
    name: 'Rose Blush',
    nameKey: 'admin.storeBranding.presetRose',
    description: 'Elegant pink tones — great for fashion, gifts, or boutique stores',
    descriptionKey: 'admin.storeBranding.presetRoseDesc',
    config: {
      version: 1,
      status: 'published',
      theme: {
        palette: 'rose',
        primaryColor: '#b5495b',
        secondaryColor: '#d4838f',
        accentColor: '#ebbdc4',
        fontFamily: 'josefin-sans',
        borderRadius: 'md',
        headerStyle: 'hero',
      },
      sections: [
        {
          id: 'rose-announce',
          type: 'announcement-bar',
          props: {
            text: '✨ New arrivals are here — shop the latest collection!',
            dismissible: true,
          },
          visible: true,
        },
        {
          id: 'rose-hero',
          type: 'hero',
          props: {
            title: 'Curated with Love',
            subtitle: 'Discover unique finds for every occasion',
            height: 'md',
            textAlign: 'center',
            overlayOpacity: 0.35,
          },
          visible: true,
        },
        {
          id: 'rose-grid',
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
          id: 'rose-collections',
          type: 'collections',
          props: { title: 'Shop by Style', mode: 'all', layout: 'grid' },
          visible: true,
        },
        {
          id: 'rose-tabs',
          type: 'store-tabs',
          props: { tabs: ['reviews', 'following', 'followers'] },
          visible: true,
        },
      ],
    },
  },
];
