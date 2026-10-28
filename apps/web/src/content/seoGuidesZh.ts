// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { SeoGuide } from './seoGuides';

/**
 * 中文指南。
 *
 * 中文内容放在独立 URL（`/zh/help/...`）下，因为语言必须由 URL 表达，搜索引擎才会
 * 把它当成一个独立页面，而不是同一页的另一段文字。根布局会依据这个前缀输出
 * `<html lang="zh-Hans">`。
 *
 * 与英文模块一样，文案本身即数据：页面渲染的内容和 FAQ 结构化数据读的是同一份
 * 文本，不会出现「页面上写了、结构化数据里没有」的情况。产品相关的事实（支持的
 * 网络、是否提供法币兑换、保障期）都取自仓库自身的文案，不是为这篇文章另编的。
 */

export const ZH_HELP_PREFIX = '/zh/help';

export const SEO_GUIDES_ZH: SeoGuide[] = [
  {
    slug: 'accept-crypto-payments',
    title: '独立站如何用加密货币收款：三条路线与四个坑',
    description:
      '独立站收加密货币实际只有三条路线：托管支付商、跳转式收款页、自建结账。区别在于订单期间资金由谁保管、退款由谁处理，以及你最后能留下什么。',
    lead:
      '独立站要收加密货币，实际只有三条路线：用托管型支付商代收、跳转到第三方收款页、或者自建结账并把款项直接结算到自己的钱包。三者的差别集中在三点——订单完成前资金由谁保管、退款由谁处理、以及你最终能留下多少。',
    sections: [
      {
        heading: '三条路线怎么选',
        table: {
          columns: ['路线', '订单期间资金在哪', '退款处理', '主要代价'],
          rows: [
            ['托管支付商', '支付商手上', '由支付商发起退款', '上手最快，但要依赖支付商'],
            ['跳转式收款页', '你的钱包或服务商', '手动处理，或服务商协助', '上线快，但买家会离开你的站点'],
            ['自建结账', '你的市场或你的钱包', '你自己的规则与争议流程', '控制力最强，退款与客服都要自己扛'],
          ],
        },
      },
      {
        heading: '开始之前必须先定下来的四件事',
        bullets: [
          '要收的每条网络各准备一个钱包，并书面记录「哪个地址对应哪条网络」。',
          '展示价格用什么货币、结账时按什么规则换算。',
          '错链付款、取消订单时的退款规则，事先写清楚。',
          '下单之后有一个明确的确认环节，让买家知道订单被记录了，而不只是转账发出去了。',
        ],
      },
      {
        heading: '选哪条链，其实是客服成本问题',
        paragraphs: [
          '每条链的手续费和确认速度都不同，而且转错网络的款项基本找不回来。这让「选链」变成结账设计的一部分：买家选的那条网络，必须和他提币的那条一致，而且要在转账之前就说明白，而不是等出事之后再解释。',
          'Mobazha 的结账页把这件事写得很直接：接受 USDT 走 BSC（BEP20）、Solana、Base、Polygon 和以太坊主网，并把 BSC 与 Solana 标为推荐选项；它不接受 TRON（TRC20），而交易所 C2C 流程又常常默认 TRC20，所以结账页会明确提醒买家不要用 TRC20 提币。',
        ],
      },
      {
        heading: '买家手上还没有加密货币怎么办',
        paragraphs: [
          '多数独立站都会遇到完全没有加密货币的买家。常见的过渡方式是交易所：买家完成实名验证，在 C2C 或 P2P 里买入 USDT，再提币到对应网络完成付款。',
          '这个兑换环节平台替不了买家。Mobazha 本身不提供法币兑 USDT，而是提供一份逐步指引，带买家走完「在交易所买 USDT → 提到支持的链 → 回结账页付款」这条路径。',
        ],
      },
      {
        heading: '最常见的四个坑',
        bullets: [
          '开了某些链却没有写清楚，买家只能靠猜，钱转到你花不出去的地方。',
          '以为付款可以撤回。链上确认之后无法追回，所以保护机制只能建立在「先托管、后放款」上。',
          '只用加密货币标价。波动会让价格在「下单」到「付款」之间失真。',
          '取消或未发货的订单没有书面退款路径，于是每一单争议都变成临时谈判。',
        ],
      },
    ],
    faq: [
      {
        question: '收加密货币需要有公司银行账户吗？',
        answer:
          '收款本身不需要：加密货币直接结算到钱包地址。但每条网络你都要有一个自己掌握私钥的钱包，账务与税务记录仍然要像刷卡收款一样留档。',
      },
      {
        question: '起步先接哪条链？',
        answer:
          '先接买家真的在用、而且他们手上的交易所支持的那一两条。在 Mobazha 的结账页上，BSC（BEP20）与 Solana 被标为推荐；以太坊主网也可用，但手续费通常更高。',
      },
      {
        question: '买家转错网络了怎么办？',
        answer:
          '先按找不回来处理。这也是为什么网络必须在结账时选定、并在转账前提醒：例如 Mobazha 不接受 TRON（TRC20），并在付款指引里写明了这一点。',
      },
      {
        question: '加密货币付款能撤回吗？',
        answer:
          '不能。链上转账一旦确认，收款方无法撤回，所以市场会先托管资金，等订单完成或保障期结束再放给卖家，而不是立刻结算。',
      },
      {
        question: '买家必须自己有钱包吗？',
        answer:
          '有钱包或交易所账户都行。用交易所的买家先在交易所买入稳定币，再提到对应网络；Mobazha 明确支持这条路径，并为买家提供了操作指引。',
      },
    ],
  },
];

export function findZhGuide(slug: string): SeoGuide | undefined {
  return SEO_GUIDES_ZH.find(guide => guide.slug === slug);
}

export function zhGuidePath(slug: string): string {
  return `${ZH_HELP_PREFIX}/${slug}`;
}

/**
 * 中文页的 `BreadcrumbList` 与 `FAQPage`。
 *
 * 英文模块的构建器会把 URL 拼成 `/help/...`，中文页需要 `/zh/help/...`，所以这里
 * 单独构造，保证结构化数据里的地址和页面的 canonical 一致。
 */
export function buildZhGuideJsonLd(guide: SeoGuide, siteUrl: string): unknown[] {
  const url = `${siteUrl}${zhGuidePath(guide.slug)}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      inLanguage: 'zh-Hans',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '帮助', item: `${siteUrl}${ZH_HELP_PREFIX}` },
        { '@type': 'ListItem', position: 2, name: guide.title, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: 'zh-Hans',
      mainEntity: guide.faq.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ];
}
