// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { Metadata } from 'next';

import { SeoGuideArticle } from '@/components/SeoGuideArticle/SeoGuideArticle';
import {
  buildZhGuideJsonLd,
  findZhGuide,
  SEO_GUIDES_ZH,
  zhGuidePath,
} from '@/content/seoGuidesZh';
import { guidePath } from '@/content/seoGuides';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';

const SLUG = 'accept-crypto-payments';

export async function generateMetadata(): Promise<Metadata> {
  const guide = findZhGuide(SLUG);
  if (!guide) return {};

  const siteUrl = await getCanonicalSiteUrl();
  const url = `${siteUrl}${zhGuidePath(SLUG)}`;
  const englishUrl = `${siteUrl}${guidePath(SLUG)}`;

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: url,
      languages: {
        // 声明两种语言版本，让搜索引擎把中文页当成独立页面，而不是英文页的重复内容。
        en: englishUrl,
        'zh-Hans': url,
      },
    },
    openGraph: {
      type: 'article',
      title: guide.title,
      description: guide.description,
      url,
      locale: 'zh_CN',
    },
  };
}

export default async function ZhAcceptCryptoPaymentsGuidePage() {
  const guide = findZhGuide(SLUG);
  if (!guide) {
    throw new Error(`Chinese guide "${SLUG}" is missing from SEO_GUIDES_ZH`);
  }

  const siteUrl = await getCanonicalSiteUrl();
  const related = SEO_GUIDES_ZH.filter(item => item.slug !== guide.slug);

  return (
    <SeoGuideArticle
      guide={guide}
      siteUrl={siteUrl}
      related={related}
      jsonLd={buildZhGuideJsonLd(guide, siteUrl)}
    />
  );
}
