// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { Metadata } from 'next';

import { SeoGuideArticle } from '@/components/SeoGuideArticle/SeoGuideArticle';
import { findGuide, guidePath, SEO_GUIDES, type SeoGuide } from '@/content/seoGuides';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';

const SLUG = 'self-hosted-marketplace';

function requireGuide(): SeoGuide {
  const guide = findGuide(SLUG);
  if (!guide) {
    throw new Error(`Guide "${SLUG}" is missing from SEO_GUIDES`);
  }
  return guide;
}

export async function generateMetadata(): Promise<Metadata> {
  const guide = findGuide(SLUG);
  if (!guide) return {};

  const siteUrl = await getCanonicalSiteUrl();
  const url = `${siteUrl}${guidePath(SLUG)}`;

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: guide.title,
      description: guide.description,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function SelfHostedMarketplaceGuidePage() {
  const guide = requireGuide();
  const siteUrl = await getCanonicalSiteUrl();
  const related = SEO_GUIDES.filter(item => item.slug !== guide.slug);

  return <SeoGuideArticle guide={guide} siteUrl={siteUrl} related={related} />;
}
