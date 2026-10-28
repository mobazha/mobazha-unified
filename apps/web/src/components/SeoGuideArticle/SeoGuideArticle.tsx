// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import Link from 'next/link';

import {
  buildGuideJsonLd,
  guidePath,
  type GuideSection,
  type GuideTable,
  type SeoGuide,
} from '@/content/seoGuides';

/**
 * Renders one guide plus its structured data.
 *
 * Deliberately a plain (server) component with no hooks so the text is part of the
 * server-rendered HTML for crawlers. Tailwind classes are explicit because the
 * repository does not install `@tailwindcss/typography`, which makes the `prose`
 * classes used by the help layout inert.
 */

function Table({ table }: { table: GuideTable }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border my-4">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {table.columns.map((column, index) => (
              <th key={index} className="text-left font-medium p-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={
                    cellIndex === 0
                      ? 'p-3 align-top text-foreground'
                      : 'p-3 align-top text-muted-foreground'
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ section }: { section: GuideSection }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mt-8 mb-2">{section.heading}</h2>
      {section.paragraphs?.map((paragraph, index) => (
        <p key={index} className="text-sm text-muted-foreground leading-relaxed mb-3">
          {paragraph}
        </p>
      ))}
      {section.table && <Table table={section.table} />}
      {section.bullets && (
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          {section.bullets.map((bullet, index) => (
            <li key={index} className="leading-relaxed">
              {bullet}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface SeoGuideArticleProps {
  guide: SeoGuide;
  /** Canonical site URL, used for the breadcrumb and FAQ structured data. */
  siteUrl: string;
  related?: SeoGuide[];
  /**
   * Overrides the generated structured data. Translated guides live under a
   * different URL prefix (`/zh/help/...`), so their breadcrumb and FAQ URLs cannot
   * come from the English path builder.
   */
  jsonLd?: unknown[];
}

export function SeoGuideArticle({ guide, siteUrl, related = [], jsonLd }: SeoGuideArticleProps) {
  const structuredData = jsonLd ?? buildGuideJsonLd(guide, siteUrl);

  return (
    <>
      {structuredData.map((node, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(node).replace(/<\//g, '<\\/'),
          }}
        />
      ))}

      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{guide.title}</h1>
      <p className="text-muted-foreground leading-relaxed">{guide.lead}</p>

      {guide.sections.map(section => (
        <Section key={section.heading} section={section} />
      ))}

      <section>
        <h2 className="text-lg font-semibold text-foreground mt-8 mb-3">Frequently asked</h2>
        <dl className="m-0">
          {guide.faq.map(item => (
            <div key={item.question} className="mb-4">
              <dt className="font-medium text-foreground text-sm">{item.question}</dt>
              <dd className="text-sm text-muted-foreground leading-relaxed mt-1 ml-0">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {related.length > 0 && (
        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="text-base font-semibold text-foreground mb-2">Related guides</h2>
          <ul className="list-none p-0 m-0 space-y-1">
            {related.map(item => (
              <li key={item.slug}>
                <Link
                  href={guidePath(item.slug)}
                  className="text-sm text-primary hover:underline min-h-[44px] inline-flex items-center"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default SeoGuideArticle;
