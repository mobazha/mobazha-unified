# PG-201: 店铺品牌化（Section-based）— 详细实施设计

> 版本: 2.1 | 日期: 2026-02-28 | 状态: Draft (reviewed & revised)
> 工作分支: `feature/pg-tier2-branding`
> Worktree: `mobazha-unified-tier2`
> 变更记录: v2.1 — 二次审核修复（SectionSwitch 缺失分支、sRGB 线性化、RichText SSR 兼容、安全约束补全）

## 1. 背景与动机

### 1.1 现状

当前店铺页面 (`apps/web/src/app/store/[peerId]/page.tsx`, ~1200 行) 使用**固定硬编码布局**：

- 固定的封面图 + 头像 + 店铺信息卡片
- 固定的 Tab 栏 (About / Listings / RWA / Reviews / Following / Followers)
- 无任何卖家自定义能力（除头像、封面图、简介文字外）

独立站首页 (`page.tsx`) 通过 `isStandalone()` 切换，使用 `StoreHero` 组件，但同样是固定布局。

**结果**：所有店铺看起来一模一样 — 千店一面。

### 1.2 目标

让每个卖家的店铺有**独特品牌形象**，通过 JSON 配置驱动 Section 组件渲染，对标 Shopify 店铺定制能力。

### 1.3 设计原则

1. **渐进增强** — 无配置时使用默认布局（向后兼容，不破坏现有体验）
2. **配置驱动** — 全部定制通过 StoreConfig JSON 描述，为 PG-202 AI Store Builder 做基础
3. **现有组件复用** — StoreHero、FilterSidebar、Collections 等已有组件尽量复用
4. **独立站优先** — 独立站首页是品牌化的主战场；SaaS 店铺页同步受益
5. **移动端响应式** — Section 组件内部自适应，无需分视图
6. **SSR 优先** — Section 内容必须出现在服务端渲染的 HTML 中（SEO 不可回退）
7. **对比度安全** — 主题色自动生成可读的文字色，卖家无法创造不可读的组合

### 1.4 成功指标

| 指标         | 目标                                | 衡量方式                  |
| ------------ | ----------------------------------- | ------------------------- |
| 自定义采纳率 | 14 天内 > 30% 卖家自定义店铺        | 跟踪 StoreConfig 创建事件 |
| 平均配置时长 | 从打开编辑器到首次保存 < 5 分钟     | 编辑器埋点                |
| 模板使用分布 | 无单一模板 > 60%（说明多样性足够）  | 统计各模板选用次数        |
| 买家体验提升 | 自定义店铺 vs 默认店铺停留时长 +15% | 前端 analytics            |
| 移动端完成率 | 移动端编辑器保存率 > 50%            | 编辑器埋点                |

---

## 2. 数据模型

### 2.1 StoreConfig Schema

```typescript
// packages/core/types/storeConfig.ts

export interface StoreConfig {
  version: 1;
  status: 'draft' | 'published';
  theme: StoreTheme;
  sections: StoreSection[];
}

export interface StoreTheme {
  palette: ThemePalette | string; // 预设调色板名 或 'custom'
  primaryColor: string; // hex, e.g. "#1a1a2e"
  secondaryColor?: string;
  accentColor?: string;
  fontFamily: FontFamily;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  headerStyle: 'minimal' | 'classic' | 'hero';
}

// 预设调色板（非设计师友好的第一入口）
export type ThemePalette =
  | 'ocean' // 深蓝 + 浅蓝 + 白
  | 'forest' // 深绿 + 米色 + 白
  | 'sunset' // 暖橙 + 珊瑚 + 奶白
  | 'midnight' // 深紫 + 靛蓝 + 白
  | 'minimal' // 纯黑 + 灰 + 白
  | 'earth' // 赤陶 + 卡其 + 白
  | 'lavender' // 薰衣草紫 + 浅灰 + 白
  | 'rose' // 玫瑰粉 + 深粉 + 白
  | 'custom'; // 自定义颜色（展开高级选择器）

// 精选字体对（Google Fonts / next/font 按需加载）
export type FontFamily =
  | 'inter' // 现代简洁（默认）
  | 'dm-sans' // 几何友好
  | 'space-grotesk' // 科技感
  | 'playfair' // 奢侈品/优雅 (serif)
  | 'lora' // 经典衬线 (serif)
  | 'merriweather' // 阅读友好 (serif)
  | 'josefin-sans' // 时尚
  | 'poppins'; // 圆润亲和
```

### 2.2 StoreSection — Discriminated Union

每种 Section 类型严格绑定对应的 Props，TypeScript 编译时保证类型安全：

```typescript
// Section 通用布局属性（所有 Section 共享）
export interface SectionLayout {
  paddingTop: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  paddingBottom: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  backgroundColor?: string; // 交替背景色（不设则透明）
  fullWidth?: boolean; // 是否突破容器全宽
}

// Discriminated Union — type 字段决定 props 类型
export type StoreSection =
  | { id: string; type: 'hero'; props: HeroSectionProps; visible: boolean; layout?: SectionLayout }
  | {
      id: string;
      type: 'announcement-bar';
      props: AnnouncementBarProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | {
      id: string;
      type: 'featured-products';
      props: FeaturedProductsProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | {
      id: string;
      type: 'product-grid';
      props: ProductGridProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | {
      id: string;
      type: 'about';
      props: AboutSectionProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | {
      id: string;
      type: 'trust-badges';
      props: TrustBadgesProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | {
      id: string;
      type: 'testimonials';
      props: TestimonialsProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | { id: string; type: 'faq'; props: FaqSectionProps; visible: boolean; layout?: SectionLayout }
  | {
      id: string;
      type: 'collections';
      props: CollectionsSectionProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | {
      id: string;
      type: 'gallery';
      props: GallerySectionProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | {
      id: string;
      type: 'rich-text';
      props: RichTextSectionProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | {
      id: string;
      type: 'contact';
      props: ContactSectionProps;
      visible: boolean;
      layout?: SectionLayout;
    }
  | {
      id: string;
      type: 'store-tabs';
      props: StoreTabsProps;
      visible: boolean;
      layout?: SectionLayout;
    };

export type SectionType = StoreSection['type'];
```

### 2.3 Section Props 定义

```typescript
// Hero
export interface HeroSectionProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  overlayOpacity?: number; // 0-100
  height: 'sm' | 'md' | 'lg' | 'full';
  textAlign: 'left' | 'center' | 'right';
}

// Announcement Bar
export interface AnnouncementBarProps {
  text: string;
  link?: string;
  dismissible: boolean;
  backgroundColor?: string;
}

// Featured Products
export interface FeaturedProductsProps {
  title: string;
  mode: 'manual' | 'newest' | 'popular';
  productSlugs?: string[]; // mode=manual 时；渲染时自动过滤已删除商品
  count: number; // mode=newest/popular 时, 4-12
  columns: 2 | 3 | 4;
}

// Product Grid
export interface ProductGridProps {
  title?: string;
  showFilters: boolean;
  showSearch: boolean;
  columns: 2 | 3 | 4;
  sortDefault: 'newest' | 'price-asc' | 'price-desc' | 'name';
}

// About
export interface AboutSectionProps {
  title: string;
  text: string; // Markdown
  image?: string;
  imagePosition: 'left' | 'right';
  showContactInfo: boolean;
}

// Trust Badges (Web3 特色，差异化核心)
export interface TrustBadgesProps {
  badges: TrustBadge[];
  layout: 'horizontal' | 'grid';
  style: 'minimal' | 'card' | 'illustrated';
}

export interface TrustBadge {
  icon: 'escrow' | 'crypto' | 'selfHosted' | 'p2p' | 'privacy' | 'custom';
  title: string;
  description: string;
  customIcon?: string;
}

// 预置 Web3 信任套件（卖家一键启用）
export const WEB3_TRUST_KIT: TrustBadge[] = [
  {
    icon: 'escrow',
    title: 'Buyer Protection',
    description: 'Funds held securely until you confirm receipt',
  },
  { icon: 'crypto', title: 'Crypto Native', description: 'Pay with ETH, BNB, SOL and more' },
  {
    icon: 'selfHosted',
    title: 'Self-Hosted',
    description: "This store runs on the seller's own server",
  },
  { icon: 'p2p', title: 'Direct Trade', description: 'No middleman between you and the seller' },
  { icon: 'privacy', title: 'Privacy First', description: 'No tracking, no data harvesting' },
];

// Testimonials
export interface TestimonialsProps {
  title: string;
  mode: 'manual' | 'latest';
  items?: Array<{ name: string; text: string; rating?: number; avatar?: string }>;
  count?: number;
}

// FAQ
export interface FaqSectionProps {
  title: string;
  items: Array<{ question: string; answer: string }>;
}

// Collections
export interface CollectionsSectionProps {
  title: string;
  mode: 'all' | 'manual';
  collectionIDs?: string[];
  layout: 'carousel' | 'grid';
  columns?: 2 | 3 | 4;
}

// Gallery
export interface GallerySectionProps {
  title?: string;
  images: Array<{ src: string; alt?: string; link?: string; caption?: string }>;
  columns: 2 | 3 | 4;
  aspectRatio: 'square' | '4:3' | '16:9' | 'auto';
  enableLightbox: boolean;
}

// Rich Text
export interface RichTextSectionProps {
  content: string; // Markdown
  maxWidth: 'sm' | 'md' | 'lg' | 'full';
}

// Contact
export interface ContactSectionProps {
  title: string;
  showEmail: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  showSocial: boolean;
  customMessage?: string;
}

// Store Tabs（系统级 Section — 承载 Reviews / Following / Followers）
export interface StoreTabsProps {
  tabs: Array<'reviews' | 'following' | 'followers'>;
}
```

### 2.4 Reviews / Followers Tab 归属

现有店铺的 Tab 结构（Reviews / Following / Followers）在 Section 模式下通过 `store-tabs` Section 承载：

- `store-tabs` 是一个**系统级 Section**，默认存在于所有配置中
- 卖家**可以排序**（上移/下移）和**隐藏**，但**不可删除**
- 不属于"可添加"列表，避免重复添加
- 渲染时复用现有的 `StoreReviewsTab`、`FollowTab` 组件

```typescript
// 默认配置中包含 store-tabs
{
  id: 'system-tabs',
  type: 'store-tabs',
  props: { tabs: ['reviews', 'following', 'followers'] },
  visible: true,
  layout: { paddingTop: 'lg', paddingBottom: 'lg' },
}
```

### 2.5 默认配置

```typescript
export const DEFAULT_STORE_CONFIG: StoreConfig = {
  version: 1,
  status: 'published',
  theme: {
    palette: 'minimal',
    primaryColor: '#000000',
    fontFamily: 'inter',
    borderRadius: 'md',
    headerStyle: 'classic',
  },
  sections: [
    {
      id: 'default-hero',
      type: 'hero',
      visible: true,
      props: { title: '', subtitle: '', height: 'md', textAlign: 'center' },
      layout: { paddingTop: 'none', paddingBottom: 'md' },
    },
    {
      id: 'default-products',
      type: 'product-grid',
      visible: true,
      props: { showFilters: true, showSearch: true, columns: 3, sortDefault: 'newest' },
      layout: { paddingTop: 'md', paddingBottom: 'lg' },
    },
    {
      id: 'system-tabs',
      type: 'store-tabs',
      visible: true,
      props: { tabs: ['reviews', 'following', 'followers'] },
      layout: { paddingTop: 'lg', paddingBottom: 'lg' },
    },
  ],
};
```

---

## 3. 后端存储

### 3.1 存储方案：NodeSettings

复用现有 `NodeSettings` key-value 存储（与 `ai_config` 同模式）：

```go
// pkg/models/node_settings.go
const SettingsKeyStoreConfig = "store_config"
```

### 3.2 API 端点

| Method | Route                              | Auth        | 说明                                |
| ------ | ---------------------------------- | ----------- | ----------------------------------- |
| GET    | `/v1/settings/storefront`          | Yes (owner) | 获取 StoreConfig                    |
| PUT    | `/v1/settings/storefront`          | Yes (owner) | 更新 StoreConfig (全量替换)         |
| GET    | `/v1/settings/storefront/{peerID}` | No (public) | 获取指定店铺的 StoreConfig (买家用) |

公开端点只返回 `status=published` 的配置中的 `sections` 和 `theme`，不泄露 draft 或内部元数据。

### 3.3 后端变更（mobazha3.0）

```go
// internal/api/storefront_handlers.go (新文件)
func (g *Gateway) handleGETStorefrontConfig(w http.ResponseWriter, r *http.Request)
func (g *Gateway) handlePUTStorefrontConfig(w http.ResponseWriter, r *http.Request)
func (g *Gateway) handleGETStorefrontConfigPublic(w http.ResponseWriter, r *http.Request)
```

```go
// internal/api/routes.go (追加)
r.Handle("/v1/settings/storefront", auth(g.handleGETStorefrontConfig)).Methods("GET")
r.Handle("/v1/settings/storefront", auth(g.handlePUTStorefrontConfig)).Methods("PUT")
r.HandleFunc("/v1/settings/storefront/{peerID}", g.handleGETStorefrontConfigPublic).Methods("GET")
```

### 3.4 后端 JSON Schema 校验

PUT handler 必须在写入前校验 StoreConfig 结构：

```go
func (g *Gateway) handlePUTStorefrontConfig(w http.ResponseWriter, r *http.Request) {
    // 1. 读取 body（限制 100KB）
    // 2. json.Unmarshal 到 StorefrontConfig Go struct
    // 3. 校验：version 必须为 1
    // 4. 校验：sections 数组不为空
    // 5. 校验：每个 section.type 在允许枚举内
    // 6. 校验：theme.primaryColor 是合法 hex
    // 7. 校验失败返回 400 + 结构化错误码
    // 8. 通过后 JSON marshal 写入 NodeSettings
}
```

Go 端定义对应的校验 struct（只做结构校验，不做完整的前端类型镜像）：

```go
type StorefrontConfig struct {
    Version  int                      `json:"version"`
    Status   string                   `json:"status"`
    Theme    StorefrontTheme          `json:"theme"`
    Sections []StorefrontSection      `json:"sections"`
}

type StorefrontTheme struct {
    PrimaryColor string `json:"primaryColor"`
    FontFamily   string `json:"fontFamily"`
    // ... 其他字段
}

type StorefrontSection struct {
    ID      string          `json:"id"`
    Type    string          `json:"type"`
    Props   json.RawMessage `json:"props"`   // 不深度解析，前端负责 props 校验
    Visible bool            `json:"visible"`
    Layout  json.RawMessage `json:"layout,omitempty"`
}
```

---

## 4. 前端架构

### 4.1 目录结构

```
packages/core/
├── types/storeConfig.ts                   # StoreConfig 类型定义 (discriminated union)
├── config/apiPaths.ts                     # 新增 STOREFRONT 路径常量
├── hooks/useStorefrontConfig.ts           # React Query hook (客户端)
├── services/api/storefront.ts             # API service
└── utils/theme.ts                         # 主题工具：对比度计算、调色板映射

apps/web/src/
├── components/store-sections/             # Section 组件目录 (新建)
│   ├── SectionRenderer.tsx                # 核心渲染器 (Server Component)
│   ├── StoreThemeProvider.tsx             # 主题 CSS 变量注入 + 对比度安全
│   ├── SectionBlock.tsx                   # Section 容器（layout padding/bg）
│   ├── HeroSection.tsx
│   ├── AnnouncementBarSection.tsx
│   ├── FeaturedProductsSection.tsx        # 含 dangling slug 自动过滤
│   ├── ProductGridSection.tsx
│   ├── StoreTabsSection.tsx              # 系统级：Reviews/Following/Followers
│   ├── AboutSection.tsx
│   ├── TrustBadgesSection.tsx            # 含 WEB3_TRUST_KIT 预设
│   ├── TestimonialsSection.tsx
│   ├── FaqSection.tsx
│   ├── CollectionsSection.tsx
│   ├── GallerySection.tsx                # 含 Lightbox
│   ├── RichTextSection.tsx               # 'use client' — DOMPurify 需要 DOM，不能在 Server Component 中运行
│   ├── ContactSection.tsx
│   ├── defaults.ts                        # DEFAULT_STORE_CONFIG + presets
│   ├── registry.ts                        # Section 元数据注册表（名称/图标/缩略图）
│   └── index.ts
│
├── components/store-editor/               # Admin 编辑器 (新建)
│   ├── StorefrontEditor.tsx               # 编辑器主组件
│   ├── SectionList.tsx                    # 带缩略图的可拖拽 Section 列表
│   ├── SectionPicker.tsx                  # 添加 Section 的预览网格弹窗
│   ├── SectionPropsEditor.tsx             # 各 Section 的属性编辑表单
│   ├── ThemeEditor.tsx                    # 调色板选择 + 高级颜色 + 字体预览
│   ├── SectionPreview.tsx                 # iframe 实时预览
│   └── presets.ts                         # 预设配置模板
│
├── app/admin/settings/storefront/
│   └── page.tsx                           # Admin 店铺外观编辑页
│
├── app/store/[peerId]/page.tsx            # 改造：SSR fetch + Section 渲染
└── app/page.tsx                           # 改造：独立站首页 SSR + Section 渲染
```

### 4.2 SectionRenderer（Server Component）

```typescript
// SSR: Server Component，Section 内容出现在 HTML 中
interface SectionRendererProps {
  config: StoreConfig;
  profile: UserProfile;
  peerId: string;
  isOwner: boolean;
}

export function SectionRenderer({ config, profile, peerId, isOwner }: SectionRendererProps) {
  const visibleSections = config.sections.filter(s => s.visible);

  return (
    <StoreThemeProvider theme={config.theme}>
      {visibleSections.map(section => (
        <SectionBlock key={section.id} layout={section.layout}>
          <SectionSwitch section={section} profile={profile} peerId={peerId} />
        </SectionBlock>
      ))}
      {isOwner && visibleSections.length === 0 && (
        <EmptyState action="Customize your store" link="/admin/settings/storefront" />
      )}
    </StoreThemeProvider>
  );
}

// Discriminated union 的类型安全分发
function SectionSwitch({ section, profile, peerId }: { section: StoreSection; profile: UserProfile; peerId: string }) {
  switch (section.type) {
    case 'hero':              return <HeroSection {...section.props} profile={profile} />;
    case 'announcement-bar':  return <AnnouncementBarSection {...section.props} />;
    case 'featured-products': return <FeaturedProductsSection {...section.props} peerId={peerId} />;
    case 'product-grid':      return <ProductGridSection {...section.props} peerId={peerId} />;
    case 'store-tabs':        return <StoreTabsSection {...section.props} peerId={peerId} />;
    case 'about':             return <AboutSection {...section.props} profile={profile} />;
    case 'trust-badges':      return <TrustBadgesSection {...section.props} />;
    case 'testimonials':      return <Suspense fallback={<SectionSkeleton />}><TestimonialsSection {...section.props} peerId={peerId} /></Suspense>;
    case 'faq':               return <FaqSection {...section.props} />;
    case 'collections':       return <Suspense fallback={<SectionSkeleton />}><CollectionsSection {...section.props} peerId={peerId} /></Suspense>;
    case 'gallery':           return <Suspense fallback={<SectionSkeleton />}><GallerySection {...section.props} /></Suspense>;
    case 'rich-text':         return <RichTextSection {...section.props} />;
    case 'contact':           return <ContactSection {...section.props} profile={profile} />;
    default: return null;
  }
}
```

P2 Section（Gallery/Testimonials/Collections）使用 `Suspense` + lazy 加载，不增加主 bundle 体积。

### 4.3 StoreThemeProvider — 对比度安全

```typescript
export function StoreThemeProvider({ theme, children }: { theme: StoreTheme; children: ReactNode }) {
  const vars = useMemo(() => {
    const primary = theme.primaryColor;
    const secondary = theme.secondaryColor || primary;
    const accent = theme.accentColor || primary;

    return {
      '--store-primary': primary,
      '--store-secondary': secondary,
      '--store-accent': accent,
      // 自动计算对比色：深背景→白字，浅背景→黑字 (WCAG AA)
      '--store-on-primary': getContrastText(primary),
      '--store-on-secondary': getContrastText(secondary),
      '--store-on-accent': getContrastText(accent),
      '--store-font': fontFamilyMap[theme.fontFamily],
      '--store-radius': radiusMap[theme.borderRadius],
    } as React.CSSProperties;
  }, [theme]);

  return <div style={vars} className="store-theme-root">{children}</div>;
}

// WCAG AA: 相对亮度 > 0.179 → 黑字，否则白字
// 必须做 sRGB gamma 线性化，否则中间色调（如 #808080）结果不准
function sRGBtoLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function getContrastText(hex: string): string {
  const r = sRGBtoLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = sRGBtoLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = sRGBtoLinear(parseInt(hex.slice(5, 7), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.179 ? '#000000' : '#ffffff';
}
```

Section 组件使用语义化变量：`color: var(--store-on-primary)` 而非硬编码黑/白。

### 4.4 Store 页面改造策略 — SSR 优先

```typescript
// apps/web/src/app/store/[peerId]/page.tsx
// Next.js Server Component — SSR fetch，SEO 数据在 HTML 中

export default async function StorePage({ params }: { params: { peerId: string } }) {
  // 并行请求 profile 和 storefront config（解决两次请求问题）
  const [profile, storefrontConfig] = await Promise.all([
    fetchProfile(params.peerId),
    fetchStorefrontConfigPublic(params.peerId).catch(() => null),
  ]);

  const isOwner = /* 从 session 判断 */;

  if (storefrontConfig) {
    return <SectionRenderer config={storefrontConfig} profile={profile} peerId={params.peerId} isOwner={isOwner} />;
  }

  // 无配置回退到现有固定布局
  return <LegacyStoreLayout profile={profile} peerId={params.peerId} isOwner={isOwner} />;
}

// SEO: 从 StoreConfig 中提取 metadata
export async function generateMetadata({ params }: { params: { peerId: string } }) {
  const [profile, config] = await Promise.all([
    fetchProfile(params.peerId),
    fetchStorefrontConfigPublic(params.peerId).catch(() => null),
  ]);
  const hero = config?.sections.find(s => s.type === 'hero' && s.visible);
  const title = hero?.props.title || profile.name;
  const description = hero?.props.subtitle || profile.shortDescription || profile.about;
  return { title, description, openGraph: { title, description, images: [/* ... */] } };
}
```

**关键**：`storefrontConfig` 在服务端 fetch，Section 内容直接渲染在 HTML 中。不走 React Query 客户端 fetch。

---

## 5. Admin 编辑器设计

### 5.1 入口

`/admin/settings/storefront` — Admin Settings 新增 "Store Appearance" / "店铺外观"。

### 5.2 编辑器布局

```
桌面端：
┌──────────────────────────────────────────────────────┐
│  ← Settings      Store Appearance    [Preview] [Save]│
├──────────────────┬───────────────────────────────────┤
│                  │                                   │
│  🎨 Theme        │                                   │
│  ┌────────────┐  │      Live Preview                 │
│  │ 🎨 Ocean   │  │      (iframe, 实时同步编辑)        │
│  │ 🌲 Forest  │  │                                   │
│  │ 🌅 Sunset  │  │      ┌──────────────────────┐     │
│  │ ⚙️ Custom  │  │      │ [Hero Section]       │     │
│  │            │  │      │ [Featured Products]  │     │
│  │ Font: [▾]  │  │      │ [Trust Badges]       │     │
│  │ 字体预览文字│  │      │ [Reviews/Followers]  │     │
│  │            │  │      │ [Product Grid]       │     │
│  │ Radius: ○● │  │      └──────────────────────┘     │
│  └────────────┘  │                                   │
│                  │                                   │
│  📋 Sections     │                                   │
│  ┌────────────┐  │                                   │
│  │ [🖼] Hero  │  │                                   │
│  │ [📦] Feat  │  │                                   │
│  │ [🛡] Trust │  │                                   │
│  │ [⭐] Tabs  │  │    Section 类型带缩略图预览        │
│  │ [📋] Grid  │  │                                   │
│  │ [+ Add]    │  │                                   │
│  └────────────┘  │                                   │
│                  │                                   │
│  (点击 Section   │                                   │
│   展开属性编辑)  │                                   │
│                  │                                   │
├──────────────────┴───────────────────────────────────┤
│  [Use Template ▾]                  [Reset to Default]│
└──────────────────────────────────────────────────────┘

移动端：
┌──────────────────────┐
│  Store Appearance    │
├──────────────────────┤
│                      │
│   [Preview Mode]     │  ← 默认显示预览
│   ┌────────────────┐ │
│   │ 实际店铺效果    │ │
│   │                │ │
│   └────────────────┘ │
│                      │
│  [Edit] 按钮点击后   │
│  从底部弹出编辑 Sheet│
│                      │
│  🎨 Theme / 📋 Sections│
│  (Tab 切换)          │
│                      │
├──────────────────────┤
│       [Save]         │
└──────────────────────┘
```

### 5.3 颜色选择体验 — 分层设计

| 层级                 | 内容                                   | 面向用户 |
| -------------------- | -------------------------------------- | -------- |
| **第一层**（默认）   | 8 个预设调色板卡片，每个显示 3 色预览  | 所有卖家 |
| **第二层**（展开）   | `react-colorful` 颜色选择器 + hex 输入 | 进阶卖家 |
| **第三层**（PG-202） | AI 从商品图片提取品牌色                | AI 增强  |

选择预设调色板时自动设置 primary/secondary/accent 三个颜色。

### 5.4 字体选择体验

每个字体选项显示该字体渲染的实际文字预览：

```
┌──────────────────────────────────┐
│  ● Inter        The quick brown  │  ← 当前选中
│  ○ DM Sans      The quick brown  │
│  ○ Playfair     The quick brown  │
│  ○ Lora         The quick brown  │
│  ○ Poppins      The quick brown  │
│  ...                             │
└──────────────────────────────────┘
```

### 5.5 Section 添加体验

点击 `[+ Add]` 弹出 Section 选择器（网格预览，非下拉列表）：

```
┌─────────────────────────────────────────┐
│  Add Section                            │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  [缩略图] │  │  [缩略图] │  │ [缩略图]││
│  │   Hero   │  │ Featured │  │  About ││
│  └──────────┘  └──────────┘  └────────┘│
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  [缩略图] │  │  [缩略图] │  │ [缩略图]││
│  │  Trust   │  │   FAQ    │  │Gallery ││
│  └──────────┘  └──────────┘  └────────┘│
│  ...                                    │
└─────────────────────────────────────────┘
```

每个 Section 类型在 `registry.ts` 中注册元数据（名称、描述、缩略图 SVG、默认 props）。

### 5.6 预设模板

| 模板            | 风格     | 调色板  | Sections                                                                                      |
| --------------- | -------- | ------- | --------------------------------------------------------------------------------------------- |
| **Minimal**     | 极简白底 | minimal | Hero(sm) + ProductGrid                                                                        |
| **Brand Story** | 叙事型   | ocean   | Hero(lg) + About + FeaturedProducts + Testimonials + StoreTabs + ProductGrid                  |
| **Trust First** | 信任优先 | forest  | AnnouncementBar + Hero(md) + TrustBadges(WEB3_TRUST_KIT) + FeaturedProducts + FAQ + StoreTabs |
| **Catalog**     | 目录型   | minimal | Collections + ProductGrid(filters) + StoreTabs                                                |
| **Artisan**     | 手工艺人 | earth   | Hero(lg) + Gallery + About + FeaturedProducts + Contact + StoreTabs                           |

所有模板自动包含 `StoreTabs` Section（可由卖家隐藏）。模板中的文字自动从 Profile 填充（name → Hero title, shortDescription → subtitle, about → About text）。

### 5.7 Draft / Preview 模式

- 编辑器的每次修改保存为 `status: 'draft'`
- 点击 `[Preview]` 打开新标签页 `?preview=draft`，渲染 draft 配置
- 点击 `[Publish]` 将 status 改为 `published`，买家立即看到新配置
- 公开端点只返回 `status: 'published'` 的配置

V1 MVP 简化实现：保存即发布（`status` 字段预留但固定为 `published`），Preview 按钮打开当前店铺页新标签。

---

## 6. 实施路线图

### Phase 1: Foundation（2 天）

| #   | 任务                                          | 仓库           | 说明                             |
| --- | --------------------------------------------- | -------------- | -------------------------------- |
| 1.1 | `StoreConfig` 类型定义（discriminated union） | unified (core) | `types/storeConfig.ts`           |
| 1.2 | 所有 Section Props + SectionLayout            | unified (core) | 同文件                           |
| 1.3 | 调色板映射 + 对比度工具                       | unified (core) | `utils/theme.ts`                 |
| 1.4 | Section 元数据注册表                          | unified (web)  | `store-sections/registry.ts`     |
| 1.5 | `DEFAULT_STORE_CONFIG` + 5 presets            | unified (web)  | `store-sections/defaults.ts`     |
| 1.6 | API paths + service                           | unified (core) | `apiPaths.ts` + `storefront.ts`  |
| 1.7 | `useStorefrontConfig` hook                    | unified (core) | React Query (客户端编辑器用)     |
| 1.8 | 后端 handlers + JSON 校验 + 路由              | mobazha3.0     | `storefront_handlers.go`, 3 端点 |

### Phase 2: Section 渲染引擎（2 天）

| #   | 任务                                  | 说明                                      |
| --- | ------------------------------------- | ----------------------------------------- |
| 2.1 | `StoreThemeProvider`（对比度安全）    | CSS 变量 + `--store-on-*` 自动计算        |
| 2.2 | `SectionBlock`                        | layout padding/backgroundColor 容器       |
| 2.3 | `SectionRenderer`（Server Component） | SSR 渲染，discriminated union 分发        |
| 2.4 | `HeroSection`                         | 全幅横幅，复用 StoreHero 设计             |
| 2.5 | `ProductGridSection`                  | 复用 FilterSidebar + StoreListingsToolbar |
| 2.6 | `FeaturedProductsSection`             | 含 dangling slug 自动过滤                 |
| 2.7 | `AnnouncementBarSection`              | 顶部公告条                                |
| 2.8 | `StoreTabsSection`                    | Reviews / Following / Followers Tab       |

### Phase 3: Store 页面集成（1-2 天）

| #   | 任务                                     | 说明                                                      |
| --- | ---------------------------------------- | --------------------------------------------------------- |
| 3.1 | 独立站首页改造                           | `page.tsx` — SSR fetch + SectionRenderer                  |
| 3.2 | 店铺页面改造                             | `store/[peerId]/page.tsx` — 并行 fetch (profile + config) |
| 3.3 | `generateMetadata` 从 config 取 SEO 数据 | Hero title/subtitle → OG title/description                |
| 3.4 | 向后兼容验证                             | API 返回 null → 回退到 LegacyStoreLayout                  |
| 3.5 | 移动端响应式验证                         | 375px 下各 Section 表现                                   |

### Phase 4: Admin 编辑器 MVP（3-4 天）

| #   | 任务                                         | 说明                                       |
| --- | -------------------------------------------- | ------------------------------------------ |
| 4.1 | `/admin/settings/storefront` 路由 + 页面骨架 | 左右分栏 + 移动端 Sheet                    |
| 4.2 | `ThemeEditor`                                | 调色板网格 + 高级颜色选择器 + 字体预览选择 |
| 4.3 | `SectionList` + 拖拽排序                     | `@dnd-kit/sortable`，带缩略图              |
| 4.4 | `SectionPicker`                              | 添加 Section 的预览网格弹窗                |
| 4.5 | `SectionPropsEditor`                         | 各 Section 的属性编辑表单                  |
| 4.6 | 实时预览 (iframe)                            | 编辑时右侧即时渲染                         |
| 4.7 | 预设模板选择                                 | "Use Template" 弹窗                        |
| 4.8 | AdminSidebar 导航项                          | "Store Appearance" 入口                    |

### Phase 5: 扩展 Sections（2-3 天）

| #   | 任务                  | 优先级 | 说明                                   |
| --- | --------------------- | ------ | -------------------------------------- |
| 5.1 | `AboutSection`        | P1     | 图文分栏                               |
| 5.2 | `TrustBadgesSection`  | P1     | WEB3_TRUST_KIT 一键预设 + 3 种视觉风格 |
| 5.3 | `TestimonialsSection` | P1     | 手动/自动拉取评价                      |
| 5.4 | `FaqSection`          | P1     | 手风琴折叠                             |
| 5.5 | `CollectionsSection`  | P1     | carousel/grid，复用已有 Collection     |
| 5.6 | `GallerySection`      | P2     | Lightbox + 多列 + 宽高比控制           |
| 5.7 | `RichTextSection`     | P2     | Markdown 渲染 + sanitize               |
| 5.8 | `ContactSection`      | P2     | 从 Profile.contactInfo 自动填充        |

### Phase 6: 打磨（1-2 天）

| #   | 任务                                                                |
| --- | ------------------------------------------------------------------- |
| 6.1 | i18n 覆盖 (en/zh) — Section 名称、编辑器文案、TrustBadge 描述       |
| 6.2 | 暗色模式兼容（`--store-on-*` 变量 + prefers-color-scheme 交叉测试） |
| 6.3 | 空状态 + 骨架屏                                                     |
| 6.4 | Profile.Colors → StoreConfig.theme fallback 映射                    |
| 6.5 | Google Fonts 按需加载优化（`next/font`）                            |
| 6.6 | E2E 测试 (编辑器 CRUD + 渲染 + 预设模板)                            |

---

## 7. 工作量估算

| Phase    | 内容                                     | 天数                   |
| -------- | ---------------------------------------- | ---------------------- |
| Phase 1  | Foundation（类型 + API + 后端 + 注册表） | 2 天                   |
| Phase 2  | Section 渲染引擎 + 5 个 P0 组件          | 2 天                   |
| Phase 3  | Store 页面 SSR 集成 + 兼容               | 1-2 天                 |
| Phase 4  | Admin 编辑器 MVP（调色板 + 拖拽 + 预览） | 3-4 天                 |
| Phase 5  | 扩展 Sections (P1 + P2)                  | 2-3 天                 |
| Phase 6  | 打磨（i18n + 暗色 + E2E）                | 1-2 天                 |
| **总计** |                                          | **11-15 天 (~2-3 周)** |

---

## 8. 与 PG-202 AI Store Builder 的衔接

PG-201 的 **StoreConfig JSON Schema** 是 PG-202 的输入/输出格式：

```
PG-201 输出:
  StoreConfig Schema + SectionRenderer + 12 Section 组件 + Admin 编辑器 + 预设模板

PG-202 在此基础上:
  品牌描述 → LLM → StoreConfig JSON → SectionRenderer 即时渲染
  对话式调整 → 修改 JSON → 重新渲染
  商品图片 → Vision Model → 推荐调色板（取代手动 ThemeEditor）
```

PG-201 完成后，PG-202 只需：

1. AI Prompt 工程（将 Schema + 调色板枚举 + Section 类型列表给 LLM）
2. 对话式 UI（复用 `AIConversation` 组件）
3. 预览 + 确认流程

---

## 9. 迁移与兼容

### 9.1 Profile.Colors 兼容

现有 Profile 的 `Colors` 字段（Primary/Secondary/Text/Highlight/HighlightText）已有部分主题数据。策略：

- **Phase 1-3**：StoreConfig.theme 独立存储，忽略 Profile.Colors
- **Phase 6**：如果 StoreConfig 不存在但 Profile.Colors 有值，自动映射为 StoreConfig.theme
- **未来**：Profile.Colors 逐步废弃（但不删除字段，保持兼容）

### 9.2 独立站首页兼容

| 条件                                   | 渲染                                      |
| -------------------------------------- | ----------------------------------------- |
| StoreConfig 存在（`status=published`） | `SectionRenderer(config)`                 |
| StoreConfig 不存在 + `isStandalone`    | 现有 `StoreHero` + Products (PG-009 成果) |
| StoreConfig 不存在 + SaaS              | 现有 SaaS 首页                            |

### 9.3 悬空引用自愈

FeaturedProducts 的 `productSlugs` 和 Collections 的 `collectionIDs` 可能指向已删除的资源。策略：

- **渲染时**：自动过滤不存在的 slug/ID，只渲染有效的
- **卖家提示**：当 featured 列表 < 原始数量 50% 时，在编辑器中显示"部分商品已下架，建议更新精选"
- **不自动修改 config**：避免在买家浏览时触发写操作

---

## 10. 技术决策

### 10.1 为什么用 NodeSettings 而非 Profile

| 方案                | 优点                                 | 缺点                                                              |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| **Profile 扩展**    | 一个 API                             | Profile 是 IPNS 公开数据，体积增大；Schema 变更需 protobuf 重生成 |
| **UserPreferences** | 已有 API                             | 语义不符（用户偏好 ≠ 店铺配置）                                   |
| **NodeSettings** ✅ | 已有 infra，key-value 灵活，租户隔离 | 需额外 API 端点（3 个）                                           |
| **新独立 Store**    | 最干净                               | 过度工程                                                          |

### 10.2 拖拽排序库

`@dnd-kit/sortable` — 项目中已有 @dnd-kit，React-first，accessible。

### 10.3 颜色选择器

`react-colorful`（~2.8KB gzip）+ 预设调色板网格（自建）。调色板是第一入口，颜色选择器是第二入口。

### 10.4 字体加载

`next/font/google` 按需加载。只加载当前店铺 config 指定的字体，不预加载全部 8 种。

---

## 11. 安全约束

| 约束                     | 说明                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **后端 JSON 校验**       | PUT handler 校验 StoreConfig 结构（version、section types 枚举、primaryColor hex 格式）                               |
| **XSS 防护**             | RichTextSection 是 `'use client'` 组件，使用 DOMPurify sanitize（DOMPurify 需要 DOM，无法在 Server Component 中运行） |
| **图片验证**             | gallery/hero 图片限制为合法 IPFS hash（`Qm...`/`bafy...`）或本站 `/v1/media/` 路径，不接受任意外部 URL                |
| **大小限制**             | StoreConfig JSON 总计最大 100KB                                                                                       |
| **Section 数量限制**     | 前端编辑器限制最多 20 个 sections，后端校验同步限制（防止恶意或误操作造成性能问题）                                   |
| **多租户隔离**           | NodeSettings 的 tenant_id 自动注入                                                                                    |
| **公开端点**             | 只返回 `status=published` 的 sections + theme                                                                         |
| **对比度安全**           | `StoreThemeProvider` 使用 sRGB 线性化正确计算 `--store-on-*` 文字色（WCAG AA 合规）                                   |
| **AnnouncementBar 关闭** | `dismissible: true` 时，关闭状态存储在 `sessionStorage`（按 section.id），刷新后重新显示                              |

---

## 12. 开放问题

| #   | 问题                  | 当前决定                                                   | 后续                          |
| --- | --------------------- | ---------------------------------------------------------- | ----------------------------- |
| 1   | Section 自定义 CSS?   | V1 不支持，安全风险                                        | PG-202 AI 可间接控制          |
| 2   | StoreConfig 版本迁移? | `version: 1` 预留，无迁移代码                              | Schema 变更时实现             |
| 3   | 图片上传入口?         | 复用现有 `POST /v1/media`                                  | —                             |
| 4   | 预设模板文字来源?     | Profile 自动填入 + 模板提供结构                            | —                             |
| 5   | 移动端编辑体验?       | 底部 Sheet 基本可用 + 提示"桌面端体验更佳"                 | PG-111 移动卖家体验增强       |
| 6   | Section 间动画?       | V1 不做（CSS `scroll-margin` 平滑滚动即可）                | Tier 2 后续增强               |
| 7   | 并发编辑冲突?         | V1 接受 last-write-wins（单卖家场景）                      | 后续可加 ETag 乐观锁          |
| 8   | 后端 Props 深度校验?  | V1 只做结构校验（`json.RawMessage`），props 校验由前端负责 | 后续可加 JSON Schema 深度校验 |

---

## 13. 视觉参考（概念 Wireframe）

### Minimal 模板

```
┌──────────────────────────────────────┐
│                                      │
│         Store Name                   │  ← Hero (sm)
│         A short tagline              │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  🔍 Search...        Sort: Newest ▾  │  ← ProductGrid
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ 📦   │  │ 📦   │  │ 📦   │       │
│  │Product│  │Product│  │Product│       │
│  │$42.00 │  │$19.99 │  │$65.00 │       │
│  └──────┘  └──────┘  └──────┘       │
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ 📦   │  │ 📦   │  │ 📦   │       │
│  └──────┘  └──────┘  └──────┘       │
│                                      │
├──────────────────────────────────────┤
│  Reviews (42) | Following | Followers│  ← StoreTabs
├──────────────────────────────────────┤
│  Footer                              │
└──────────────────────────────────────┘
```

### Brand Story 模板

```
┌──────────────────────────────────────┐
│ 🎨 Ocean 调色板（深蓝 + 白）         │
│                                      │
│         ████████████████████         │
│         █  Store Name      █         │  ← Hero (lg, 背景图 + 遮罩)
│         █  Brand tagline   █         │
│         █  [ Shop Now ]    █         │
│         ████████████████████         │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  ┌─────────────┐  Our Story          │  ← About (图左文右)
│  │   [品牌图]   │  We started in a   │
│  │             │  small workshop...  │
│  └─────────────┘                     │
│                                      │
├──────────────────────────────────────┤
│          Featured Products           │  ← FeaturedProducts
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ Best │  │ New  │  │ Sale │       │
│  │Seller│  │Arrive│  │      │       │
│  └──────┘  └──────┘  └──────┘       │
│                                      │
├──────────────────────────────────────┤
│  ⭐⭐⭐⭐⭐ "Amazing quality!"          │  ← Testimonials
│  ⭐⭐⭐⭐⭐ "Fast shipping!"            │
│                                      │
├──────────────────────────────────────┤
│  Reviews | Following | Followers     │  ← StoreTabs
├──────────────────────────────────────┤
│  All Products  🔍 Sort ▾             │  ← ProductGrid
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐               │
│  └──┘ └──┘ └──┘ └──┘               │
├──────────────────────────────────────┤
│  Footer                              │
└──────────────────────────────────────┘
```

### Trust First 模板

```
┌──────────────────────────────────────┐
│  📢 Free shipping on orders > $50!   │  ← AnnouncementBar
├──────────────────────────────────────┤
│                                      │
│         Store Name                   │  ← Hero (md)
│         Trusted Web3 Commerce        │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  🛡 Buyer     ₿ Crypto    🏠 Self    │  ← TrustBadges (horizontal)
│  Protection   Native      Hosted    │
│                                      │
│  🤝 Direct    🔒 Privacy             │
│  Trade        First                 │
│                                      │
├──────────────────────────────────────┤
│          Featured Products           │  ← FeaturedProducts
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  └──────┘  └──────┘  └──────┘       │
│                                      │
├──────────────────────────────────────┤
│  ▸ How does buyer protection work?   │  ← FAQ (手风琴)
│  ▸ What cryptocurrencies accepted?   │
│  ▸ How long does shipping take?      │
│                                      │
├──────────────────────────────────────┤
│  Reviews | Following | Followers     │  ← StoreTabs
├──────────────────────────────────────┤
│  Footer                              │
└──────────────────────────────────────┘
```

---

最后更新: 2026-02-28 (v2.1: 二次审核修复 — SectionSwitch/sRGB/RichText SSR/安全约束)
