'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import type {
  StoreSection,
  HeroSectionProps,
  AnnouncementBarProps,
  FeaturedProductsProps,
  ProductGridProps,
  AboutSectionProps,
  FaqSectionProps,
  TrustBadgesProps,
  TestimonialsProps,
  ContactSectionProps,
  GallerySectionProps,
  RichTextSectionProps,
  CollectionsSectionProps,
  StoreTabsProps,
  VideoSectionProps,
  CountdownSectionProps,
} from '@mobazha/core';
import { TextInput, TextArea, SelectInput, ToggleInput, NumberInput } from './form-helpers';

interface SectionPropsEditorProps {
  section: StoreSection;
  onUpdate: (props: Record<string, unknown>) => void;
}

export function SectionPropsEditor({ section, onUpdate }: SectionPropsEditorProps) {
  switch (section.type) {
    case 'hero':
      return <HeroEditor props={section.props} onUpdate={onUpdate} />;
    case 'announcement-bar':
      return <AnnouncementEditor props={section.props} onUpdate={onUpdate} />;
    case 'featured-products':
      return <FeaturedProductsEditor props={section.props} onUpdate={onUpdate} />;
    case 'product-grid':
      return <ProductGridEditor props={section.props} onUpdate={onUpdate} />;
    case 'about':
      return <AboutEditor props={section.props} onUpdate={onUpdate} />;
    case 'trust-badges':
      return <TrustBadgesEditor props={section.props} onUpdate={onUpdate} />;
    case 'testimonials':
      return <TestimonialsEditor props={section.props} onUpdate={onUpdate} />;
    case 'faq':
      return <FaqEditor props={section.props} onUpdate={onUpdate} />;
    case 'contact':
      return <ContactEditor props={section.props} onUpdate={onUpdate} />;
    case 'gallery':
      return <GalleryEditor props={section.props} onUpdate={onUpdate} />;
    case 'rich-text':
      return <RichTextEditor props={section.props} onUpdate={onUpdate} />;
    case 'collections':
      return <CollectionsEditor props={section.props} onUpdate={onUpdate} />;
    case 'video':
      return <VideoEditor props={section.props} onUpdate={onUpdate} />;
    case 'countdown':
      return <CountdownEditor props={section.props} onUpdate={onUpdate} />;
    case 'store-tabs':
      return <StoreTabsEditor props={section.props} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

type EditorProps<T> = { props: T; onUpdate: (p: Record<string, unknown>) => void };

function HeroEditor({ props, onUpdate }: EditorProps<HeroSectionProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title}
        onChange={v => onUpdate({ title: v })}
      />
      <TextInput
        label={t('admin.storeBranding.fieldSubtitle')}
        value={props.subtitle || ''}
        onChange={v => onUpdate({ subtitle: v })}
      />
      <TextInput
        label={t('admin.storeBranding.fieldBackgroundImage')}
        value={props.backgroundImage || ''}
        onChange={v => onUpdate({ backgroundImage: v })}
        placeholder="https://..."
      />
      <TextInput
        label={t('admin.storeBranding.fieldCtaText')}
        value={props.ctaText || ''}
        onChange={v => onUpdate({ ctaText: v })}
        placeholder="Shop Now"
      />
      <TextInput
        label={t('admin.storeBranding.fieldCtaLink')}
        value={props.ctaLink || ''}
        onChange={v => onUpdate({ ctaLink: v })}
        placeholder="/products"
      />
      <SelectInput
        label={t('admin.storeBranding.fieldHeight')}
        value={props.height}
        options={[
          { value: 'sm', label: t('admin.storeBranding.optSmall') },
          { value: 'md', label: t('admin.storeBranding.optMedium') },
          { value: 'lg', label: t('admin.storeBranding.optLarge') },
          { value: 'full', label: t('admin.storeBranding.optFullScreen') },
        ]}
        onChange={v => onUpdate({ height: v })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldTextAlign')}
        value={props.textAlign}
        options={[
          { value: 'left', label: t('admin.storeBranding.optLeft') },
          { value: 'center', label: t('admin.storeBranding.optCenter') },
          { value: 'right', label: t('admin.storeBranding.optRight') },
        ]}
        onChange={v => onUpdate({ textAlign: v })}
      />
    </div>
  );
}

function AnnouncementEditor({ props, onUpdate }: EditorProps<AnnouncementBarProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldText')}
        value={props.text}
        onChange={v => onUpdate({ text: v })}
      />
      <TextInput
        label={t('admin.storeBranding.fieldLink')}
        value={props.link || ''}
        onChange={v => onUpdate({ link: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldDismissible')}
        checked={props.dismissible}
        onChange={v => onUpdate({ dismissible: v })}
      />
    </div>
  );
}

function FeaturedProductsEditor({ props, onUpdate }: EditorProps<FeaturedProductsProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title}
        onChange={v => onUpdate({ title: v })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldMode')}
        value={props.mode}
        options={[
          { value: 'newest', label: t('admin.storeBranding.optNewest') },
          { value: 'popular', label: t('admin.storeBranding.optPopular') },
          { value: 'manual', label: t('admin.storeBranding.optManual') },
        ]}
        onChange={v => onUpdate({ mode: v })}
      />
      <NumberInput
        label={t('admin.storeBranding.fieldCount')}
        value={props.count}
        onChange={v => onUpdate({ count: v })}
        min={1}
        max={12}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldColumns')}
        value={String(props.columns)}
        options={[
          { value: '2', label: t('admin.storeBranding.optColumns2') },
          { value: '3', label: t('admin.storeBranding.optColumns3') },
          { value: '4', label: t('admin.storeBranding.optColumns4') },
        ]}
        onChange={v => onUpdate({ columns: Number(v) })}
      />
    </div>
  );
}

function ProductGridEditor({ props, onUpdate }: EditorProps<ProductGridProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title || ''}
        onChange={v => onUpdate({ title: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowFilters')}
        checked={props.showFilters}
        onChange={v => onUpdate({ showFilters: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowSearch')}
        checked={props.showSearch}
        onChange={v => onUpdate({ showSearch: v })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldColumns')}
        value={String(props.columns)}
        options={[
          { value: '2', label: t('admin.storeBranding.optColumns2') },
          { value: '3', label: t('admin.storeBranding.optColumns3') },
          { value: '4', label: t('admin.storeBranding.optColumns4') },
        ]}
        onChange={v => onUpdate({ columns: Number(v) })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldDefaultSort')}
        value={props.sortDefault}
        options={[
          { value: 'newest', label: t('admin.storeBranding.optNewest') },
          { value: 'price-asc', label: t('admin.storeBranding.optPriceAsc') },
          { value: 'price-desc', label: t('admin.storeBranding.optPriceDesc') },
          { value: 'name', label: t('admin.storeBranding.optName') },
        ]}
        onChange={v => onUpdate({ sortDefault: v })}
      />
    </div>
  );
}

function AboutEditor({ props, onUpdate }: EditorProps<AboutSectionProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title}
        onChange={v => onUpdate({ title: v })}
      />
      <TextArea
        label={t('admin.storeBranding.fieldText')}
        value={props.text}
        onChange={v => onUpdate({ text: v })}
      />
      <TextInput
        label={t('admin.storeBranding.fieldImage')}
        value={props.image || ''}
        onChange={v => onUpdate({ image: v })}
        placeholder="https://..."
      />
      <SelectInput
        label={t('admin.storeBranding.fieldImagePosition')}
        value={props.imagePosition}
        options={[
          { value: 'left', label: t('admin.storeBranding.optLeft') },
          { value: 'right', label: t('admin.storeBranding.optRight') },
        ]}
        onChange={v => onUpdate({ imagePosition: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowContactInfo')}
        checked={props.showContactInfo}
        onChange={v => onUpdate({ showContactInfo: v })}
      />
    </div>
  );
}

function TrustBadgesEditor({ props, onUpdate }: EditorProps<TrustBadgesProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <SelectInput
        label={t('admin.storeBranding.fieldLayout')}
        value={props.layout}
        options={[
          { value: 'horizontal', label: t('admin.storeBranding.optHorizontal') },
          { value: 'grid', label: t('admin.storeBranding.optGrid') },
        ]}
        onChange={v => onUpdate({ layout: v })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldStyle')}
        value={props.style}
        options={[
          { value: 'minimal', label: t('admin.storeBranding.optMinimal') },
          { value: 'card', label: t('admin.storeBranding.optCard') },
          { value: 'illustrated', label: t('admin.storeBranding.optIllustrated') },
        ]}
        onChange={v => onUpdate({ style: v })}
      />
      <p className="text-xs text-muted-foreground">
        {props.badges.length} {t('admin.storeBranding.sectionTrustBadges').toLowerCase()}
      </p>
    </div>
  );
}

function TestimonialsEditor({ props, onUpdate }: EditorProps<TestimonialsProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title}
        onChange={v => onUpdate({ title: v })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldMode')}
        value={props.mode}
        options={[
          { value: 'latest', label: t('admin.storeBranding.optLatest') },
          { value: 'manual', label: t('admin.storeBranding.optManual') },
        ]}
        onChange={v => onUpdate({ mode: v })}
      />
      <NumberInput
        label={t('admin.storeBranding.fieldCount')}
        value={props.count || 3}
        onChange={v => onUpdate({ count: v })}
        min={1}
        max={10}
      />
    </div>
  );
}

function FaqEditor({ props, onUpdate }: EditorProps<FaqSectionProps>) {
  const { t } = useI18n();
  const items = props.items || [];

  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    const newItems = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onUpdate({ items: newItems });
  };

  const addItem = () => {
    onUpdate({ items: [...items, { question: '', answer: '' }] });
  };

  const removeItem = (index: number) => {
    onUpdate({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title}
        onChange={v => onUpdate({ title: v })}
      />
      {items.map((item, i) => (
        <div key={i} className="p-2 rounded bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Q{i + 1}</span>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="text-xs text-destructive hover:underline"
            >
              {t('admin.storeBranding.removeFaqItem')}
            </button>
          </div>
          <TextInput
            label={t('admin.storeBranding.fieldQuestion')}
            value={item.question}
            onChange={v => updateItem(i, 'question', v)}
          />
          <TextArea
            label={t('admin.storeBranding.fieldAnswer')}
            value={item.answer}
            onChange={v => updateItem(i, 'answer', v)}
            rows={2}
          />
        </div>
      ))}
      <button type="button" onClick={addItem} className="text-xs text-primary hover:underline">
        {t('admin.storeBranding.addFaqItem')}
      </button>
    </div>
  );
}

function ContactEditor({ props, onUpdate }: EditorProps<ContactSectionProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title}
        onChange={v => onUpdate({ title: v })}
      />
      <TextArea
        label={t('admin.storeBranding.fieldCustomMessage')}
        value={props.customMessage || ''}
        onChange={v => onUpdate({ customMessage: v })}
        rows={2}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowEmail')}
        checked={props.showEmail}
        onChange={v => onUpdate({ showEmail: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowPhone')}
        checked={props.showPhone}
        onChange={v => onUpdate({ showPhone: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowWebsite')}
        checked={props.showWebsite}
        onChange={v => onUpdate({ showWebsite: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowSocial')}
        checked={props.showSocial}
        onChange={v => onUpdate({ showSocial: v })}
      />
    </div>
  );
}

function GalleryEditor({ props, onUpdate }: EditorProps<GallerySectionProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title || ''}
        onChange={v => onUpdate({ title: v })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldColumns')}
        value={String(props.columns)}
        options={[
          { value: '2', label: t('admin.storeBranding.optColumns2') },
          { value: '3', label: t('admin.storeBranding.optColumns3') },
          { value: '4', label: t('admin.storeBranding.optColumns4') },
        ]}
        onChange={v => onUpdate({ columns: Number(v) })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldAspectRatio')}
        value={props.aspectRatio}
        options={[
          { value: 'square', label: t('admin.storeBranding.optSquare') },
          { value: '4:3', label: '4:3' },
          { value: '16:9', label: '16:9' },
          { value: 'auto', label: t('admin.storeBranding.optAuto') },
        ]}
        onChange={v => onUpdate({ aspectRatio: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldEnableLightbox')}
        checked={props.enableLightbox}
        onChange={v => onUpdate({ enableLightbox: v })}
      />
      <p className="text-xs text-muted-foreground">{props.images.length} image(s)</p>
    </div>
  );
}

function RichTextEditor({ props, onUpdate }: EditorProps<RichTextSectionProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextArea
        label={t('admin.storeBranding.fieldHtmlContent')}
        value={props.content}
        onChange={v => onUpdate({ content: v })}
        rows={5}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldMaxWidth')}
        value={props.maxWidth}
        options={[
          { value: 'sm', label: t('admin.storeBranding.optSmall') },
          { value: 'md', label: t('admin.storeBranding.optMedium') },
          { value: 'lg', label: t('admin.storeBranding.optLarge') },
          { value: 'full', label: t('admin.storeBranding.optFull') },
        ]}
        onChange={v => onUpdate({ maxWidth: v })}
      />
    </div>
  );
}

function CollectionsEditor({ props, onUpdate }: EditorProps<CollectionsSectionProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title}
        onChange={v => onUpdate({ title: v })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldMode')}
        value={props.mode}
        options={[
          { value: 'all', label: t('admin.storeBranding.optAllCollections') },
          { value: 'manual', label: t('admin.storeBranding.optManualSelection') },
        ]}
        onChange={v => onUpdate({ mode: v })}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldLayout')}
        value={props.layout}
        options={[
          { value: 'carousel', label: t('admin.storeBranding.optCarousel') },
          { value: 'grid', label: t('admin.storeBranding.optGrid') },
        ]}
        onChange={v => onUpdate({ layout: v })}
      />
    </div>
  );
}

function StoreTabsEditor({ props, onUpdate }: EditorProps<StoreTabsProps>) {
  const { t } = useI18n();
  const allTabs: Array<'reviews' | 'following' | 'followers'> = [
    'reviews',
    'following',
    'followers',
  ];

  const tabLabelKeys: Record<string, string> = {
    reviews: 'profile.reviews',
    following: 'profile.following',
    followers: 'profile.followers',
  };

  const toggleTab = (tab: (typeof allTabs)[number]) => {
    const current = props.tabs || [];
    const newTabs = current.includes(tab) ? current.filter(t => t !== tab) : [...current, tab];
    onUpdate({ tabs: newTabs });
  };

  return (
    <div className="space-y-2">
      {allTabs.map(tab => (
        <ToggleInput
          key={tab}
          label={t(tabLabelKeys[tab])}
          checked={(props.tabs || []).includes(tab)}
          onChange={() => toggleTab(tab)}
        />
      ))}
    </div>
  );
}

function VideoEditor({ props, onUpdate }: EditorProps<VideoSectionProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title || ''}
        onChange={v => onUpdate({ title: v })}
      />
      <TextInput
        label={t('admin.storeBranding.fieldVideoUrl')}
        value={props.videoUrl}
        onChange={v => onUpdate({ videoUrl: v })}
        placeholder={t('admin.storeBranding.placeholderVideoUrl')}
      />
      <TextInput
        label={t('admin.storeBranding.fieldPosterImage')}
        value={props.posterImage || ''}
        onChange={v => onUpdate({ posterImage: v })}
        placeholder={t('admin.storeBranding.placeholderPosterImage')}
      />
      <SelectInput
        label={t('admin.storeBranding.fieldAspectRatio')}
        value={props.aspectRatio || '16:9'}
        options={[
          { value: '16:9', label: '16:9' },
          { value: '4:3', label: '4:3' },
          { value: '1:1', label: '1:1' },
        ]}
        onChange={v => onUpdate({ aspectRatio: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldAutoplay')}
        checked={props.autoplay || false}
        onChange={v => onUpdate({ autoplay: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldLoop')}
        checked={props.loop || false}
        onChange={v => onUpdate({ loop: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldMuted')}
        checked={props.muted || false}
        onChange={v => onUpdate({ muted: v })}
      />
    </div>
  );
}

function CountdownEditor({ props, onUpdate }: EditorProps<CountdownSectionProps>) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <TextInput
        label={t('admin.storeBranding.fieldTitle')}
        value={props.title || ''}
        onChange={v => onUpdate({ title: v })}
      />
      <TextInput
        label={t('admin.storeBranding.fieldTargetDate')}
        value={props.targetDate}
        onChange={v => onUpdate({ targetDate: v })}
        placeholder="2026-03-15T00:00:00Z"
      />
      <TextInput
        label={t('admin.storeBranding.fieldEndMessage')}
        value={props.endMessage || ''}
        onChange={v => onUpdate({ endMessage: v })}
        placeholder={t('admin.storeBranding.placeholderEndMessage')}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowDays')}
        checked={props.showDays ?? true}
        onChange={v => onUpdate({ showDays: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowHours')}
        checked={props.showHours ?? true}
        onChange={v => onUpdate({ showHours: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowMinutes')}
        checked={props.showMinutes ?? true}
        onChange={v => onUpdate({ showMinutes: v })}
      />
      <ToggleInput
        label={t('admin.storeBranding.fieldShowSeconds')}
        checked={props.showSeconds ?? true}
        onChange={v => onUpdate({ showSeconds: v })}
      />
    </div>
  );
}
