import { describe, it, expect } from 'vitest';
import { validateAndFixStoreConfig } from '../../utils/storeConfigValidator';
import type { StoreConfig } from '../../types/storeConfig';

const VALID_CONFIG: StoreConfig = {
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
      id: 'test-hero',
      type: 'hero',
      props: { title: 'Welcome', height: 'md', textAlign: 'center' },
      visible: true,
    },
    {
      id: 'test-featured',
      type: 'featured-products',
      props: { title: 'Featured', mode: 'newest', count: 4, columns: 4 },
      visible: true,
    },
    {
      id: 'test-tabs',
      type: 'store-tabs',
      props: { tabs: ['reviews', 'following', 'followers'] },
      visible: true,
    },
  ],
};

describe('validateAndFixStoreConfig', () => {
  it('returns valid config as-is', () => {
    const result = validateAndFixStoreConfig(VALID_CONFIG);
    expect(result.version).toBe(1);
    expect(result.status).toBe('published');
    expect(result.theme.palette).toBe('ocean');
    expect(result.theme.fontFamily).toBe('playfair');
    expect(result.sections).toHaveLength(3);
    expect(result.sections[0].type).toBe('hero');
    expect(result.sections[2].type).toBe('store-tabs');
  });

  it('forces version and status', () => {
    const input = {
      ...VALID_CONFIG,
      version: 99,
      status: 'draft',
    };
    const result = validateAndFixStoreConfig(input);
    expect(result.version).toBe(1);
    expect(result.status).toBe('published');
  });

  it('fixes invalid theme values to defaults', () => {
    const input = {
      ...VALID_CONFIG,
      theme: {
        palette: 'nonexistent',
        primaryColor: 'not-a-color',
        fontFamily: 'comic-sans',
        borderRadius: 'huge',
        headerStyle: 'fancy',
      },
    };
    const result = validateAndFixStoreConfig(input);
    expect(result.theme.palette).toBe('custom');
    expect(result.theme.primaryColor).toBe('#000000');
    expect(result.theme.fontFamily).toBe('inter');
    expect(result.theme.borderRadius).toBe('md');
    expect(result.theme.headerStyle).toBe('minimal');
  });

  it('filters out unknown section types', () => {
    const input = {
      ...VALID_CONFIG,
      sections: [
        {
          id: 'ok',
          type: 'hero',
          props: { title: 'Hi', height: 'md', textAlign: 'center' },
          visible: true,
        },
        { id: 'bad', type: 'unknown-widget', props: {}, visible: true },
        {
          id: 'ok2',
          type: 'about',
          props: { title: 'About', text: 'Hi', imagePosition: 'left', showContactInfo: false },
          visible: true,
        },
        { id: 'tabs', type: 'store-tabs', props: { tabs: ['reviews'] }, visible: true },
      ],
    };
    const result = validateAndFixStoreConfig(input);
    expect(result.sections).toHaveLength(3);
    expect(result.sections.map(s => s.type)).toEqual(['hero', 'about', 'store-tabs']);
  });

  it('appends store-tabs if missing', () => {
    const input = {
      ...VALID_CONFIG,
      sections: [
        {
          id: 'h',
          type: 'hero',
          props: { title: 'Hi', height: 'md', textAlign: 'center' },
          visible: true,
        },
      ],
    };
    const result = validateAndFixStoreConfig(input);
    const tabsSection = result.sections.find(s => s.type === 'store-tabs');
    expect(tabsSection).toBeDefined();
    expect(tabsSection!.id).toBe('ai-store-tabs');
  });

  it('returns default fallback for non-object input', () => {
    expect(validateAndFixStoreConfig(null).sections.length).toBeGreaterThanOrEqual(2);
    expect(validateAndFixStoreConfig(undefined).version).toBe(1);
    expect(validateAndFixStoreConfig('string').status).toBe('published');
    expect(validateAndFixStoreConfig(42).theme.fontFamily).toBe('inter');
    expect(validateAndFixStoreConfig([]).version).toBe(1);
  });

  it('truncates sections beyond MAX_SECTIONS (20)', () => {
    const manySections = Array.from({ length: 25 }, (_, i) => ({
      id: `s-${i}`,
      type: 'hero' as const,
      props: { title: `Section ${i}`, height: 'md' as const, textAlign: 'center' as const },
      visible: true,
    }));
    const input = { ...VALID_CONFIG, sections: manySections };
    const result = validateAndFixStoreConfig(input);
    // 20 hero + 1 appended store-tabs (since the 25 sections had no store-tabs)
    expect(result.sections.length).toBeLessThanOrEqual(21);
  });

  it('generates ids for sections missing them', () => {
    const input = {
      ...VALID_CONFIG,
      sections: [
        { type: 'hero', props: { title: 'Hi', height: 'md', textAlign: 'center' }, visible: true },
        {
          id: '',
          type: 'about',
          props: { title: 'About', text: 'Hi', imagePosition: 'left', showContactInfo: false },
          visible: true,
        },
      ],
    };
    const result = validateAndFixStoreConfig(input);
    expect(result.sections[0].id).toBeTruthy();
    expect(result.sections[1].id).toBeTruthy();
    expect(result.sections[0].id).not.toBe(result.sections[1].id);
  });

  it('preserves valid hex colors', () => {
    const input = {
      ...VALID_CONFIG,
      theme: {
        ...VALID_CONFIG.theme,
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        accentColor: '#0000ff',
      },
    };
    const result = validateAndFixStoreConfig(input);
    expect(result.theme.primaryColor).toBe('#ff0000');
    expect(result.theme.secondaryColor).toBe('#00ff00');
    expect(result.theme.accentColor).toBe('#0000ff');
  });

  it('handles missing theme gracefully', () => {
    const input = { sections: VALID_CONFIG.sections };
    const result = validateAndFixStoreConfig(input);
    expect(result.theme.fontFamily).toBe('inter');
    expect(result.theme.primaryColor).toBe('#000000');
  });

  it('handles missing sections gracefully', () => {
    const input = { theme: VALID_CONFIG.theme };
    const result = validateAndFixStoreConfig(input);
    expect(result.sections.length).toBeGreaterThanOrEqual(1);
    expect(result.sections.some(s => s.type === 'store-tabs')).toBe(true);
  });
});
