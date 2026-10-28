// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Public help/guide articles.
 *
 * The copy lives here rather than inside the page components so the rendered
 * article and the structured data can never drift apart: `buildGuideJsonLd()`
 * reads exactly the text the reader sees. Facts about how checkout and buyer
 * protection behave are taken from the product's own policy and help copy
 * (`packages/core/i18n/locales/en.ts`), not invented here.
 */

export interface GuideTable {
  columns: string[];
  rows: string[][];
}

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: GuideTable;
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface SeoGuide {
  slug: string;
  title: string;
  description: string;
  /** One-paragraph answer, written to be quotable on its own. */
  lead: string;
  sections: GuideSection[];
  faq: GuideFaq[];
}

export const SEO_GUIDES: SeoGuide[] = [
  {
    slug: 'self-hosted-marketplace',
    title: 'Self-hosted marketplace software: what it is and why sellers switch',
    description:
      'A self-hosted marketplace runs on infrastructure you control, so the storefront, catalogue and customer records stay yours. What that changes, and what to check before you move.',
    lead:
      'A self-hosted marketplace is marketplace software you run on your own server and domain instead of renting from a platform. The storefront, the product catalogue, the order history and the customer records live in a database you control, and the store stays reachable at your own address even if a third-party service changes its rules or shuts down.',
    sections: [
      {
        heading: 'What "self-hosted" actually means',
        paragraphs: [
          'Self-hosting is about who operates the software, not about what the software can do. You install it on a server you rent or own, point a domain at it, and keep the database. The marketplace is then online under your name rather than under a platform account.',
          'In practice three things change: you decide when to upgrade, your customer list never leaves your database, and your storefront URL is a domain you can keep for as long as you want.',
        ],
      },
      {
        heading: 'Self-hosted marketplace vs. hosted marketplace SaaS',
        table: {
          columns: ['', 'Self-hosted', 'Hosted SaaS'],
          rows: [
            ['Who runs the server', 'You (or your hosting account)', 'The vendor'],
            ['Where customer data lives', 'Your database', "The vendor's database"],
            ['Storefront address', 'Your own domain', 'A subdomain or vendor path'],
            ['Who can suspend the store', 'You', 'The vendor, under its terms'],
            ['Effect of stopping payment', 'Nothing shuts down', 'The store usually goes offline'],
            ['Upgrade timing', 'You choose', 'The vendor chooses'],
          ],
        },
      },
      {
        heading: 'Why sellers move to self-hosted marketplaces',
        bullets: [
          'The customer relationship stays with you: email lists, order history and repeat buyers are in your database, not in a platform export.',
          'Search visibility accrues to your domain, so the links and rankings you earn keep working.',
          'No third party sits between you and your settlement: payments go to wallets you control.',
          'Nothing about your catalogue is locked behind an account that can be closed.',
        ],
      },
      {
        heading: 'What to check before you self-host',
        bullets: [
          'A deploy path you can actually follow: look for a container image or a one-command deploy, not a wiki page full of manual steps.',
          'Backups and restore: know where the database lives and how to take a copy before you upgrade.',
          'Upgrade path: an actively maintained project should publish releases you can follow.',
          'Domain and TLS: the store must be reachable over HTTPS on a domain you own.',
          'Settlement and dispute handling: decide up front which wallets receive payments and how disputes are resolved.',
        ],
      },
      {
        heading: 'How Mobazha fits this model',
        paragraphs: [
          'Mobazha Unified is open source under the MPL-2.0 licence and ships both a hosted platform and a stand-alone deployment, so the same interface can run as a self-hosted storefront. A stand-alone node keeps the catalogue, orders and customer records in its own database, and buyers can pay in crypto at checkout.',
          'Because a self-hosted store is still a marketplace rather than a single-seller shop, it also carries the parts a plain storefront does not: multiple sellers, listing moderation and buyer protection on each order.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is a self-hosted marketplace the same thing as a self-hosted store?',
        answer:
          'No. A self-hosted store has one seller and sells that seller\'s own products. A self-hosted marketplace runs the same way technically but supports multiple sellers, so it also needs listing moderation, per-seller payouts and a dispute process.',
      },
      {
        question: 'Do I need blockchain experience to run a self-hosted marketplace?',
        answer:
          'No. Running the node is ordinary web hosting work: a server, a domain and a database. You do need at least one wallet address for the networks you accept, and you should understand which network each payment arrives on.',
      },
      {
        question: 'Can a self-hosted marketplace use my own domain?',
        answer:
          'Yes — that is the point of hosting it yourself. The marketplace is served from your domain, which is also why links to it accumulate authority on your site instead of someone else\'s.',
      },
      {
        question: 'What happens to the marketplace if I stop hosting it?',
        answer:
          'There is no subscription to lapse, so nothing is switched off remotely, but the store does go offline when the server stops. Keep database backups and, if continuity matters, keep the ability to restore the node somewhere else.',
      },
      {
        question: 'Is open-source marketplace software really free?',
        answer:
          'The licence costs nothing for the software itself. You still pay for the server and the domain, and crypto payments carry network fees. Budget for hosting and for the time it takes to keep the node updated.',
      },
    ],
  },
  {
    slug: 'accept-crypto-payments',
    title: 'How to accept crypto payments on your store',
    description:
      'Custodial processor, hosted checkout, or self-hosted checkout: the three ways to accept crypto payments, what each one changes, and the mistakes that cause lost orders.',
    lead:
      'There are three practical ways to accept crypto payments in a store: route payments through a custodial payment processor, hand the customer off to a hosted checkout page, or run the checkout yourself and settle directly to wallets you control. The choice decides who holds the funds before the order completes, who handles refunds, and how much of the payment you actually keep.',
    sections: [
      {
        heading: 'The three ways to accept crypto',
        table: {
          columns: ['Approach', 'Who holds funds mid-order', 'Refund handling', 'Main trade-off'],
          rows: [
            ['Custodial processor', 'The processor', 'Processor issues refunds', 'Easiest to set up; you depend on the processor'],
            ['Hosted checkout page', 'Your wallet, or the provider', 'Manual or provider-assisted', 'Fast to launch; the buyer leaves your site'],
            ['Self-hosted checkout', 'Your marketplace or your wallet', 'Your own policy and disputes', 'Most control; you own refunds and support'],
          ],
        },
      },
      {
        heading: 'What you need in place first',
        bullets: [
          'At least one wallet per network you intend to accept, and a written record of which address belongs to which network.',
          'A displayed price in a currency your buyers understand, and a rule for how that price converts at checkout.',
          'A refund policy that says what happens if the buyer pays on the wrong network or the order is cancelled.',
          'A confirmation step, so the buyer knows the order was recorded rather than only that a transfer was broadcast.',
        ],
      },
      {
        heading: 'Network choice is a customer-support decision',
        paragraphs: [
          'Every network has its own fees and confirmation behaviour, and a payment sent on the wrong one is usually unrecoverable. That makes network selection part of checkout design: the network the buyer picks has to match the network they withdraw to, and the store has to say so before the transfer rather than after.',
          'Mobazha checkout is explicit about this. It accepts USDT on BSC (BEP20), Solana, Base, Polygon and Ethereum mainnet, and marks BSC and Solana as the recommended options. It does not accept TRON (TRC20), which is a common default on exchange C2C flows, so the checkout warns buyers not to withdraw on TRC20.',
        ],
      },
      {
        heading: 'If your buyers do not hold crypto yet',
        paragraphs: [
          'Most stores take some orders from buyers who own no crypto. The usual bridge is an exchange: the buyer verifies their identity, buys a stablecoin such as USDT in a C2C or P2P flow, then withdraws it to a wallet and pays.',
          'A store cannot do that conversion for the buyer. Mobazha, for example, does not provide fiat-to-USDT conversion; it publishes step-by-step guidance that walks a buyer through buying USDT on an exchange and withdrawing it on a supported network.',
        ],
      },
      {
        heading: 'The mistakes that cause lost orders',
        bullets: [
          'Accepting a network you do not document, so buyers guess and send funds to an address you cannot spend from.',
          'Assuming a payment can be reversed. A confirmed on-chain transfer cannot be clawed back, so protection has to be built around holding funds before release.',
          'Pricing in crypto only. Volatility makes the price stale between order and payment; quote in a stable unit and settle in crypto.',
          'No written refund path for cancelled or unshipped orders, which turns every dispute into a manual negotiation.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do I need a bank account to accept crypto payments?',
        answer:
          'Not to receive the payments themselves — crypto settles to a wallet address. You still need a wallet you control per network, and you should keep records for tax and accounting in the same way you would for card payments.',
      },
      {
        question: 'Which network should a store start with?',
        answer:
          'Start with the one or two networks your buyers actually use and that their exchange supports. On Mobazha checkout, BSC (BEP20) and Solana are marked as recommended; Ethereum mainnet is accepted but usually carries higher fees.',
      },
      {
        question: 'What if the buyer sends the payment on the wrong network?',
        answer:
          'Assume it is not recoverable. That is why the network is chosen at checkout and why the store should warn before the transfer: Mobazha, for instance, does not accept TRON (TRC20) and says so in its payment guidance.',
      },
      {
        question: 'Are crypto payments reversible?',
        answer:
          'No. Once a transfer is confirmed it cannot be reversed by the recipient, which is why marketplaces hold the funds and release them after the order completes instead of paying sellers immediately.',
      },
      {
        question: 'Do customers need their own wallet?',
        answer:
          'Either a wallet or an exchange account works. A customer using an exchange buys the stablecoin there and withdraws it on the matching network; Mobazha supports that route explicitly and documents it for buyers.',
      },
    ],
  },
  {
    slug: 'crypto-escrow-buyer-protection',
    title: 'Crypto escrow and buyer protection, explained',
    description:
      'How escrow protects crypto orders: funds are held before release, protection periods run 14 days for physical goods, 3 for digital and 7 for services, and disputes go to an independent mediator.',
    lead:
      'Escrow means a neutral holding step between payment and payout: the buyer pays, the marketplace holds the funds, and the seller only receives them once the order is confirmed or the protection period ends. It exists because a confirmed crypto transfer cannot be reversed — without escrow, the buyer carries all the risk of a seller who never ships.',
    sections: [
      {
        heading: 'Why crypto orders need an escrow step',
        paragraphs: [
          'Card payments can be charged back; on-chain transfers cannot. That asymmetry is the whole problem: a buyer sending crypto to a stranger is trusting the seller with funds that cannot be recalled, and a seller shipping first is trusting a buyer who could disappear.',
          'Escrow moves the trust to a third party for the short window where it matters, and gives both sides a defined process with deadlines instead of a negotiation.',
        ],
      },
      {
        heading: 'How an escrow-protected order runs',
        bullets: [
          'The buyer pays at checkout, and the funds are held in a secure account rather than passed to the seller.',
          'The seller fulfils the order inside the shipping window.',
          'The buyer confirms receipt and the funds are released, or the order completes automatically when the protection period ends with no issue raised.',
          'If something goes wrong, the buyer reports it during the protection period and the dispute process takes over.',
        ],
      },
      {
        heading: 'Protection periods on Mobazha',
        table: {
          columns: ['Product type', 'Protection period', 'Auto-cancel if not shipped'],
          rows: [
            ['Physical goods', '14 days', '7 days'],
            ['Digital products', '3 days', '3 days'],
            ['Services', '7 days', '3 days'],
          ],
        },
        paragraphs: [
          'Orders settle automatically when the protection period ends, so a buyer who does nothing still gets the order completed without having to confirm anything. If the seller does not ship within the required window, the order is cancelled automatically and the funds are returned.',
          'For physical goods with a delayed shipment, the buyer can request a single 14-day extension of the protection period.',
        ],
      },
      {
        heading: 'What happens in a dispute',
        paragraphs: [
          'A buyer reports the problem during the protection period, and the first seven days are reserved for resolving it directly with the seller. If that fails, an independent mediator steps in and issues a decision within seven days.',
          'There is also a seven-day after-sale window: issues reported after the order completes are still handled, which covers the gap between a parcel arriving and its contents being checked.',
        ],
      },
      {
        heading: 'Who actually holds the money',
        paragraphs: [
          'This is the question worth asking any marketplace, because "escrow" is sometimes used loosely. On Mobazha the payment is held in a secure account and released to the seller only after the protection period ends or the buyer confirms receipt, and the deadlines above are what make the process predictable.',
          'The practical difference between escrow models is who can move the funds and under what rules. Read the buyer protection policy of any marketplace before you buy and check three things: when funds are released, what happens if the seller never ships, and who decides a dispute.',
        ],
      },
    ],
    faq: [
      {
        question: 'What is escrow in crypto?',
        answer:
          'Escrow in crypto means holding a payment between the buyer and the seller until the order is fulfilled. It replaces the chargeback protection that card payments have, because a confirmed on-chain transfer cannot be reversed.',
      },
      {
        question: 'How long does buyer protection last?',
        answer:
          'On Mobazha the protection period is 14 days for physical goods, 3 days for digital products and 7 days for services, measured from the payment. Once it ends, the order completes automatically.',
      },
      {
        question: 'What happens if the seller never ships?',
        answer:
          'The order is cancelled automatically and the funds are returned: after 7 days for physical goods, after 3 days for digital products and services. For a delayed physical shipment the buyer can ask for a single 14-day extension instead.',
      },
      {
        question: 'Who decides a dispute?',
        answer:
          'The buyer and seller get seven days to resolve it between themselves. If they cannot, an independent mediator makes the decision within seven days.',
      },
      {
        question: 'Does buyer protection cover the whole order?',
        answer:
          'The funds for the order are held until release, and issues can be reported during the protection period and for seven days after the order completes. Check the buyer protection policy for the exceptions that apply to a specific item.',
      },
    ],
  },
  {
    slug: 'shopify-alternative',
    title: 'Self-hosted Shopify alternative: what actually changes',
    description:
      'What you gain and what you take on when you move from a hosted commerce platform to a self-hosted marketplace, compared on hosting, crypto checkout, data ownership and buyer protection.',
    lead:
      'Shopify is a hosted commerce platform: it runs the storefront, holds the account, and settles payments to the merchant. A self-hosted marketplace such as Mobazha inverts that — you run the software, the catalogue and customer records live in your database, and crypto settles to wallets you control. The useful question is not which one is better, but which of those trade-offs your business can absorb.',
    sections: [
      {
        heading: 'The comparison in one table',
        table: {
          columns: ['', 'Hosted platform (Shopify)', 'Self-hosted marketplace (Mobazha)'],
          rows: [
            ['Who runs the storefront', 'The platform', 'You'],
            ['Where customer data lives', "The platform's database", 'Your database'],
            ['Storefront address', 'Your domain, on their infrastructure', 'Your domain, on your infrastructure'],
            ['Crypto checkout', 'Added through a third-party payment provider', 'Part of checkout, settling to wallets you control'],
            ['Buyer protection', 'Card chargebacks, where the card network applies', 'Funds held until the order completes; disputes go to a moderator'],
            ['App ecosystem', 'Very large', 'Small — it is a marketplace, not a storefront platform'],
            ['Strongest at', 'Card-first retail, shipping and tax integrations', 'Crypto-settled sales, multi-seller marketplaces, owning the store'],
          ],
        },
      },
      {
        heading: 'Where the hosted platform is the better answer',
        paragraphs: [
          'It is worth being blunt about this, because a comparison that only argues one way is not useful. If most of your revenue arrives by card, you ship physical goods with carrier and tax integrations, and you want a large app ecosystem plus a support contract, a hosted platform is doing real work for you. Replacing that with self-hosted software means replacing all of it yourself.',
          'The same applies if you need a storefront platform for a single brand with themes, marketing apps and point-of-sale hardware. That is a different product category from a marketplace.',
        ],
      },
      {
        heading: 'Where a self-hosted marketplace wins',
        bullets: [
          'Settlement: crypto payments reach wallets you control instead of passing through a platform account.',
          'Data: the customer list, order history and catalogue stay in a database you can back up, query and export.',
          'Continuity: nothing can switch the store off remotely, because the store is your deployment.',
          'Multi-seller operation: a marketplace with listing moderation and per-order buyer protection is the product, not an add-on.',
          'Search equity: links and rankings accrue to the domain you keep.',
        ],
      },
      {
        heading: 'What you take on',
        bullets: [
          'Hosting, TLS and upgrades are yours to run.',
          'Backups and a tested restore plan are yours to own.',
          'There is no support contract: documentation and the project issue tracker.',
          'Refunds and disputes are your policy, executed with the marketplace tools.',
          'A smaller integration ecosystem — budget for wiring up anything unusual.',
        ],
      },
      {
        heading: 'A pragmatic middle path',
        paragraphs: [
          'The two models are not mutually exclusive. A seller can keep a hosted storefront for card-first retail and run a self-hosted marketplace alongside it for crypto-settled sales, community sellers or a region where card processing is awkward. Nothing in either model prevents that, and it is often the way teams migrate: move the channel that hurts, keep the one that works.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is Mobazha a drop-in Shopify replacement?',
        answer:
          'No. Mobazha is a marketplace you host, not a single-brand storefront platform with a large app ecosystem. If you depend on shipping and tax integrations or theme apps, it does not replace them one for one — it is a different model, and the trade-offs are the ones in the table above.',
      },
      {
        question: 'Does Shopify support crypto payments natively?',
        answer:
          'On a hosted platform, crypto arrives through third-party payment providers rather than as part of the platform itself. Mobazha has crypto checkout built in: buyers pay on a supported network and the funds settle to wallets the seller controls.',
      },
      {
        question: 'Will moving to a self-hosted marketplace hurt SEO?',
        answer:
          'Only if you change domain. Self-hosting means the store is served from a domain you own, so the links and rankings you accumulate stay attached to something you keep, rather than to a platform-controlled address.',
      },
      {
        question: 'Can I run a hosted storefront and a self-hosted marketplace at the same time?',
        answer:
          'Yes. Nothing in either model prevents running both channels, and it is a common way to migrate: keep the platform for card-first sales while the self-hosted marketplace takes the crypto-settled or community-seller traffic.',
      },
      {
        question: 'How does buyer protection differ?',
        answer:
          "Card payments rely on the card network's chargeback process. Crypto cannot be reversed, so Mobazha holds the funds for an order and releases them when the buyer confirms or the protection period ends — 14 days for physical goods, 3 for digital products and 7 for services.",
      },
    ],
  },
  {
    slug: 'openbazaar-alternative',
    title: 'OpenBazaar is no longer maintained: what the community did next',
    description:
      'OpenBazaar 2.0 reached end of life in January 2021 when OB1 exhausted its funding and closed the infrastructure. People from that community continued the work as Mobazha. Here is the timeline, and what it means if you are looking for a replacement.',
    lead:
      'OpenBazaar 2.0 reached end of life in January 2021: OB1, the company behind it, had spent the roughly $4.2M it raised, asked users to withdraw their funds and closed the infrastructure that held the network together. Mobazha was started by people from that community who did not want the work to stop — we are an independent successor, not affiliated with or endorsed by the original OB1, OpenBazaar or Haven teams.',
    sections: [
      {
        heading: 'What actually happened to OpenBazaar',
        paragraphs: [
          'The end was gradual rather than sudden. In September 2020 OpenBazaar announced it would halt its seed nodes from 1 October and discontinue support for the Haven wallet and the internal messenger. On 4 January 2021 OB1 announced it was deprecating the remaining infrastructure, including the blockbook wallet APIs. By 15 January 2021 the servers had stopped functioning.',
          'OB1 raised about $4.2M in 2014 and spent it across seven years. Donation rounds through 2020 and 2021 did not close the gap, so the company asked users to withdraw their funds, shut the business down and closed the infrastructure because it could no longer pay for it. The software was never the problem — the funding was.',
        ],
      },
      {
        heading: 'Who continued it, and what Mobazha is',
        paragraphs: [
          'Mobazha is maintained by people who were part of the OpenBazaar community before the shutdown; some of us spent years trying to bring it to local shopkeepers and community markets. When OB1 announced it was quitting, we decided to keep building instead of letting it end. The name comes from the company behind the project, Mulgore Tech: Mobazha is short for "Mulgore Bazaar".',
          'The continuation was announced publicly in the OpenBazaar subreddit in 2023, and that post is still up: reddit.com/r/OpenBazaar/comments/13bn0lw/openbazaar_is_alive_now_it_is_mobazha/. To be explicit about the boundaries — Mobazha is an independent successor. We are not OB1, we are not the former OpenBazaar team, and we are not endorsed by them. We do respect the work they did, including releasing the original under an open licence, which is what made continuing it possible at all.',
        ],
      },
      {
        heading: 'What this means if you are looking for an alternative',
        paragraphs: [
          'Someone searching for an "OpenBazaar alternative" today is usually asking one of two things. Either they want the same idea — a marketplace where the operator is not a company in the middle — or they still have a store from that era and want to know where to put it.',
          'For the first question, judge any replacement on whether it can survive its maintainers: an ordinary web deployment you can host, a permissive licence, and a documented backup and upgrade path. For the second, the honest answer is that there is no automatic importer, so migration is a mapping exercise — see the migration notes below.',
        ],
      },
      {
        heading: 'Requirements that decide whether a replacement survives',
        bullets: [
          'Still maintained: releases, dependency updates and security fixes you can follow.',
          'Self-hostable: a deployment you can keep running without anyone else\u2019s permission.',
          'Ordinary web deployment: a container or a standard web host, rather than a specialised client that needs its own machine and NAT traversal.',
          'Crypto settlement you control: payments arrive at wallets you hold.',
          'Real buyer protection: funds held with deadlines and a dispute path, not just trust in the seller.',
          'An open licence, so you can fork the code if the project is abandoned.',
          'A documented upgrade and backup path, because a store you cannot restore is not really yours.',
        ],
      },
      {
        heading: 'How Mobazha measures against those requirements',
        table: {
          columns: ['Requirement', 'Mobazha'],
          rows: [
            ['Licence', 'MPL-2.0, so you can fork and self-host it'],
            ['Self-hosting', 'Ships a stand-alone deployment alongside the hosted platform'],
            ['Deployment', 'A container or a standard web deployment on your own domain'],
            ['Crypto checkout', 'USDT on BSC, Solana, Base, Polygon and Ethereum mainnet; TRON is not accepted'],
            ['Buyer protection', 'Funds held per order, 14/3/7-day protection periods, mediator-handled disputes'],
            ['Marketplace features', 'Multiple sellers, listing moderation and per-order protection'],
          ],
        },
      },
      {
        heading: 'Questions to ask any alternative',
        bullets: [
          'Who is actively maintaining it, and when was the last release?',
          'Can I export my catalogue, orders and customers if I leave?',
          'Does checkout hold funds, or does the seller receive them immediately?',
          'What happens if the project stops — is the licence permissive enough to fork?',
          'Can I run it on a server I control, on a domain I own?',
        ],
      },
      {
        heading: 'Practical migration notes',
        paragraphs: [
          'There is no OpenBazaar-specific importer in Mobazha, so budget for a one-off mapping of products and customers. Mobazha does ship product import tooling for supplier catalogues and Gumroad exports, which covers part of the work if that is where your data already lives.',
          'A migration is a good moment to fix listings rather than copy them: export the catalogue, re-check titles, images, condition and shipping terms while you move, and keep the old store reachable until the new one is indexed.',
        ],
      },
    ],
    faq: [
      {
        question: 'What happened to OpenBazaar?',
        answer:
          'OpenBazaar 2.0 reached end of life in January 2021. OB1, the company behind it, had raised about $4.2M in 2014 and ran out of runway; donation rounds through 2020 and 2021 did not close the gap. It halted seed nodes and Haven wallet support in late 2020, deprecated the remaining infrastructure on 4 January 2021, and by 15 January 2021 the servers had stopped.',
      },
      {
        question: 'Is Mobazha the successor to OpenBazaar?',
        answer:
          'Mobazha is an independent successor: it is built by people who were part of the OpenBazaar community before the shutdown and chose to continue the work. It is not affiliated with, endorsed by or operated by OB1 or the former OpenBazaar and Haven teams. The continuation was announced in the OpenBazaar subreddit in 2023.',
      },
      {
        question: 'Is OpenBazaar still maintained?',
        answer:
          'No. The original client and its successor Haven stopped being actively developed after the 2021 shutdown. If you want something to build a store on today, treat them as history rather than as a running platform.',
      },
      {
        question: 'What is the closest alternative to OpenBazaar?',
        answer:
          "It depends on what you need. If you want a marketplace you host yourself with crypto settlement, that is self-hosted marketplace software such as Mobazha. If you want someone else to run it, a hosted platform is simpler but the account is not yours. If you only need one seller's storefront, a conventional shop platform may be enough.",
      },
      {
        question: 'Can I migrate an existing OpenBazaar store?',
        answer:
          'There is no OpenBazaar importer, so products, orders and customer records need a one-off mapping. Mobazha does include import tooling for supplier catalogues and Gumroad exports, which reduces the manual work if your data is already in one of those formats.',
      },
      {
        question: 'Does a decentralized marketplace still need a server?',
        answer:
          'Yes. "Decentralized" describes who is in control — you run the software and hold the data — not the absence of infrastructure. You still pay for a server and a domain, and you still keep backups.',
      },
      {
        question: 'Is open-source marketplace software free to use?',
        answer:
          'The licence costs nothing: Mobazha is MPL-2.0, so you can run and modify it. Your costs are the server, the domain and crypto network fees, plus the time it takes to keep the deployment updated.',
      },
    ],
  },
  {
    slug: 'openbazaar-successor',
    title: "OpenBazaar's successor: the timeline from shutdown to today",
    description:
      "A dated record of OpenBazaar's shutdown — seed nodes and Haven in 2020, OB1's deprecation notice on 4 January 2021, servers off by 15 January — and how people from that community continued the work as Mobazha.",
    lead:
      "OpenBazaar's successor is Mobazha, an independent continuation built by people from the original community after OB1 wound the project down in January 2021. This page is the dated record: what happened, when it happened, what carried over, and how to check every claim for yourself.",
    sections: [
      {
        heading: 'The shutdown, dated',
        table: {
          columns: ['When', 'What happened'],
          rows: [
            ['2014', 'OB1 raises about $4.2M to build OpenBazaar'],
            ['September 2020', 'OpenBazaar announces it will halt its seed nodes from 1 October and discontinue support for the Haven wallet and internal messenger'],
            ['4 January 2021', 'OB1 announces deprecation of the remaining infrastructure, including the blockbook wallet APIs'],
            ['15 January 2021', 'The servers stop functioning; users are asked to withdraw funds'],
            ['2020–2021', 'Several donation rounds fail to close the funding gap; the company shuts down and closes the infrastructure'],
            ['2023', 'The continuation is announced publicly in the OpenBazaar subreddit: "OpenBazaar is alive, now it is Mobazha"'],
          ],
        },
      },
      {
        heading: 'What carried over, and what changed',
        bullets: [
          'Carried over: the idea that the operator of a marketplace should not be a company sitting between buyer and seller, and the open-source licence that made continuing the work possible.',
          'Carried over: the community — some of us had spent years introducing OpenBazaar to local shopkeepers and community markets before the shutdown.',
          'Changed: Mobazha runs as a web deployment rather than a desktop client, so an operator can host a storefront with ordinary hosting, a domain and a database.',
          'Changed: checkout settles in crypto to seller-controlled wallets, and every order is held with a protection period instead of being released immediately.',
          'Added: multi-seller stores, listing moderation and a dispute process with deadlines and a mediator.',
        ],
      },
      {
        heading: 'How to verify this yourself',
        bullets: [
          'The continuation post is public in the OpenBazaar subreddit: reddit.com/r/OpenBazaar/comments/13bn0lw/openbazaar_is_alive_now_it_is_mobazha/',
          'The source is public and licensed MPL-2.0: github.com/mobazha/mobazha-unified',
          'The project is listed on BNB Chain\'s official dApp directory with on-chain activity: dappbay.bnbchain.org/detail/mobazha',
          'The name is documented: Mobazha is short for "Mulgore Bazaar", from Mulgore Tech, the company behind the project.',
        ],
      },
      {
        heading: 'If you still have an OpenBazaar-era store',
        paragraphs: [
          'There is no automatic importer, so a migration is a mapping exercise: export what you can, re-create listings, and keep the old store reachable while the new one is indexed. Mobazha does ship import tooling for supplier catalogues and Gumroad exports, which covers part of the work if your data is already in one of those formats.',
          'A migration is a good moment to fix listings rather than copy them — re-check titles, images, condition, shipping terms and category while you move.',
        ],
      },
      {
        heading: 'What we are not claiming',
        paragraphs: [
          'Mobazha is an independent successor. We are not OB1, we are not the former OpenBazaar team, we do not own the OpenBazaar or Haven names, and we are not endorsed by anyone who does. We also do not claim that the original codebase is being carried forward line by line — Mobazha is its own implementation, written to keep the same idea running with maintainable, ordinary web technology.',
        ],
      },
    ],
    faq: [
      {
        question: 'Who owns OpenBazaar now?',
        answer:
          'OB1, the company that built it, shut the project down in January 2021 and closed its infrastructure after running out of funding. The software was released under an open licence, which is what allows others to continue working with it.',
      },
      {
        question: 'Is Mobazha endorsed by the original OpenBazaar team?',
        answer:
          'No, and we do not claim to be. Mobazha is an independent successor built by former community members. It is not affiliated with, endorsed by or operated by OB1 or the former OpenBazaar and Haven teams.',
      },
      {
        question: 'How can I tell whether a "successor" claim is real?',
        answer:
          'Ask for three things: a dated, public announcement of the continuation; verifiable evidence of who is building it (a public repository, a company, an active listing); and an explicit statement of what the project is not claiming. A claim with no dates and no verifiable evidence should be treated as marketing rather than succession.',
      },
      {
        question: 'What happened to Haven?',
        answer:
          'Haven was the successor product from the same team after OpenBazaar 2.0. Support for the Haven wallet and messenger ended in late 2020, and it is not actively developed today.',
      },
      {
        question: 'Is the original OpenBazaar code still available?',
        answer:
          'The original repositories were published under open licences before the shutdown, so the code remains available to read, fork and learn from. What is gone is the hosted infrastructure, the seed network and the funding that kept development going.',
      },
    ],
  },
  {
    slug: 'marketplace-alternatives',
    title: 'Etsy, Amazon, Temu and Ozon alternatives: what to use when you want to keep your store',
    description:
      'The realistic alternatives for sellers leaving Etsy, Amazon, Temu or Ozon, compared on the three things that actually matter: who owns the customer list, who can close the store, and how the money reaches you.',
    lead:
      'There is no single "Etsy alternative" or "Amazon alternative". The honest options split into three groups: move to another marketplace, move to a hosted store builder, or run software you host yourself. What separates them is not the feature list but three questions — who owns the customer list, who can switch the store off, and how the money reaches you.',
    sections: [
      {
        heading: 'Why sellers leave each platform',
        table: {
          columns: ['Leaving', 'The reason that usually triggers it'],
          rows: [
            ['Etsy', 'Rising fees and ad spend, and account suspensions that arrive without a clear appeal path'],
            ['Amazon', 'Account deactivation and funds held while a case is reviewed — often the entire business in one decision'],
            ['Temu', 'Price-led competition that leaves little brand equity and no customer relationship'],
            ['Ozon', 'Cross-border settlement and payout friction, and exposure to local regulatory changes'],
            ['eBay', 'Fee changes and account limits on established sellers'],
            ['Walmart Marketplace', 'Strict approval and performance thresholds with suspension as the enforcement tool'],
          ],
        },
      },
      {
        heading: 'The three real alternatives',
        table: {
          columns: ['Option', 'Who can close it', 'Customer list', 'Payments'],
          rows: [
            ['Another marketplace', 'The new platform too', 'Stays with the platform', 'Platform-controlled'],
            ['Hosted store builder', 'The vendor, under its terms', 'Yours, but on their platform', 'Cards, plus add-ons'],
            ['Self-hosted marketplace / store', 'You', 'In your own database', 'Crypto settled to your wallets'],
          ],
        },
      },
      {
        heading: 'The three questions that decide it',
        bullets: [
          'Who owns the customer list? If you cannot export it and keep emailing those buyers, you are renting your audience rather than building one.',
          'Who can turn the store off? On a platform, the answer is "someone else, under their terms, with an appeal of unknown length".',
          'How does the money reach you? Card settlement can be held or reversed through chargebacks; crypto settles directly, but it cannot be reversed either, so protection has to come from holding funds until the order completes.',
        ],
      },
      {
        heading: 'Where crypto settlement changes the answer',
        paragraphs: [
          'If you sell physical goods or services delivered outside the app, crypto payments are a legitimate settlement path — the App Store guidelines, for example, require sellers of physical goods to use something other than in-app purchase. That is a narrow but very useful place where "accept crypto" is not a workaround but the expected route.',
          'The catch is that crypto cannot be reversed, so a marketplace that takes crypto has to protect the buyer another way: hold the payment, release it when the order is confirmed or the protection period ends, cancel and refund automatically when the seller never ships, and route unresolved disputes to a mediator. On Mobazha those periods are 14 days for physical goods, 3 days for digital products and 7 days for services.',
        ],
      },
      {
        heading: 'Migrating without losing your customers',
        bullets: [
          'Export everything the old platform will give you before you announce anything — product data, order history, and any customer contact list you are entitled to keep.',
          'Announce the new store to your own list first; the audience you already have is the only demand you control.',
          'Re-create your best listings first rather than all of them, and fix titles, images and categories while you move.',
          'Keep the old storefront reachable until the new one is indexed, then redirect what you can.',
          'Tell buyers why you moved — "you can now buy from us directly" converts better than a generic announcement.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is there an Etsy alternative that pays out in crypto?',
        answer:
          'Yes, if you run the store yourself. A self-hosted or hosted marketplace with crypto checkout settles payments to wallets you control instead of to a platform balance. Mobazha is one example: it accepts USDT on BSC, Solana, Base, Polygon and Ethereum mainnet and settles to seller-owned wallets.',
      },
      {
        question: 'What can I use instead of Amazon if my seller account was suspended?',
        answer:
          'Moving to another large marketplace repeats the same risk, because another company still holds the account and the funds. The alternatives that remove that specific risk are a hosted store builder on your own domain, or software you host yourself so no third party can deactivate the store.',
      },
      {
        question: 'Is there a Temu alternative for sellers who want their own brand?',
        answer:
          'Temu competes on price rather than brand, so the opposite of Temu is having your own storefront with your own name and your own customer list. Any hosted builder or self-hosted marketplace does that; the difference is only who controls the infrastructure and how you get paid.',
      },
      {
        question: 'What about Ozon for cross-border sellers?',
        answer:
          'The recurring complaints are settlement and payout friction plus exposure to local regulatory change. If cross-border payouts are the problem you are solving, look for a setup where settlement does not depend on one platform being able to pay you — for crypto sellers that means settling directly to wallets.',
      },
      {
        question: 'Do I lose my customers when I leave a marketplace?',
        answer:
          'You lose the *relationship* unless you exported the contact data you are entitled to and keep selling to them directly. That is why the customer list question comes before the feature list when comparing alternatives.',
      },
      {
        question: 'Can I run my own marketplace instead of selling on someone else\u2019s?',
        answer:
          'Yes. Self-hostable marketplace software such as Mobazha can run on your own server and domain, support multiple sellers, and keep the catalogue, orders and customer records in your own database. The trade-off is that hosting, backups, support and refunds become your responsibility.',
      },
    ],
  },
];

export function findGuide(slug: string): SeoGuide | undefined {
  return SEO_GUIDES.find(guide => guide.slug === slug);
}

export function guidePath(slug: string): string {
  return `/help/${slug}`;
}

/**
 * `BreadcrumbList` plus `FAQPage` for one guide.
 *
 * The breadcrumb mirrors the visible navigation (`Help` → article) so the
 * structured data describes the page rather than an invented hierarchy. The FAQ
 * node is what generative engines quote, so its answers are the same sentences
 * the reader sees.
 */
export function buildGuideJsonLd(guide: SeoGuide, siteUrl: string): unknown[] {
  const url = `${siteUrl}${guidePath(guide.slug)}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Help', item: `${siteUrl}/help` },
        { '@type': 'ListItem', position: 2, name: guide.title, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: guide.faq.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ];
}

/** `ItemList` for the help index so the guides are discoverable as a set. */
export function buildGuideIndexJsonLd(siteUrl: string): unknown {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Mobazha guides',
    itemListElement: SEO_GUIDES.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: guide.title,
      url: `${siteUrl}${guidePath(guide.slug)}`,
    })),
  };
}
