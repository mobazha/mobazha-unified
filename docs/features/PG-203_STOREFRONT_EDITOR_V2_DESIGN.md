# PG-203: 店铺外观编辑器 V2 — 现状评审与产品化规划

> 版本: 1.1 | 日期: 2026-07-15 | 状态: **Implemented（V2-P0 ~ V2-P3 主体已实现，见 §8）** 前置:
> PG-201（Section 品牌化，已实现）、PG-202（AI Store
> Builder，已实现）触发事件: 卖家实际使用反馈——「精选商品选了手动模式，但不知道在哪里手动选择商品」（微信群，2026-07）

## 8. 实施记录（2026-07-15）

- **V2-P0 全部落地**：`ResourcePicker.tsx`（ProductPickerField/CollectionPickerField，搜索+选择顺序+拖拽排序）；
  `ItemListEditor.tsx` 泛化（评价/徽章/图片墙/FAQ 全部可编辑）；编辑器预览改传真实 peerID；
  `ImageInput`（上传复用节点 media 管线，存 CID，URL 粘贴为次路径）；countdown 日期控件；Section 自定义命名（`StoreSection.name`）。渲染端修复：manual 模式保序、空清单渲染空（不再回退「最新」）；HeroSection
  backgroundImage/headerHashes 走 getImageUrl（修 raw hash bug）。
- **V2-P1 全部落地**：`EditableSectionRenderer.tsx`
  画布点选/hover 高亮/双向滚动联动；undo/redo 历史栈（⌘Z/⇧⌘Z）；草稿/发布工作流——节点侧新增
  `store_config_draft`
  settings 槽（`SettingsKeyStoreConfigDraft`），PUT 按 status 分流、发布清空草稿、`DELETE /v1/settings/storefront/draft`、GET
  `?variant=draft`（mobazha 仓库）。
- **V2-P2 主体落地**：Hero 无图渐变兜底；TrustBadges/编辑器图标 emoji→lucide
  SVG（`SectionIcon.tsx`）；TrustBadges 尊重卖家自定义文案（stock 文案才走 i18n）；4 套行业模板（数码/收藏品/数字商品/服饰）；编辑器空态引导（`StoreEditorContext`）。后端 section 白名单补 video/countdown（原会 400）。
- **V2-P3 主体落地**：`generate_store`
  喂入真实目录（≤20 条 slug+title），manual 精选直接引用真实 slug、前端幻觉 slug 消毒；
  `refine_store` 对话式微调接入 AI Builder 预览页；新增 `rewrite_text`
  action + 字段级「AI 改写」（hero 标题/副标题、公告、关于文案）。
- **待续（本轮明确未做）**：分享预览链接（token）；就地文本编辑（P1-4）；信任标识与真实托管/结算能力联动（P2-4 后半）；主题令牌角色化 UI；ja/ko/es/fr/de/ru/pt 七语种新 key 翻译（现回退英文）。

### 8.1 二轮 UX 审核修复（2026-07-15，同日）

录制 demo 后按产品/UX 视角复审，修掉六处仍在的体验问题：

1. **「恢复经典布局」不再直接发布**：原 `handleResetClassic` 调
   `publish({sections: []})`，一个次级 ghost 按钮绕过草稿槽直接改线上店铺——这是草稿/发布模型里唯一的洞。现改为
   `applyChange`，落草稿、可撤销、发布才生效。
2. **发布加二次确认 + 变更摘要**：`summarizeChanges()`
   比对 live 与待发布配置，列出「主题外观已调整 / 新增·删除·修改 N 个区域 / 区域顺序已调整 / 首次发布」。原先破坏性更小的「恢复经典」「放弃草稿」都有确认，唯独发布没有，层级是倒挂的。
3. **顶栏从 9 个元素降到 4 个**：AI 生成 / 使用模板 移到左栏顶部（它们是「从什么开始」，不是随时动作）；恢复经典布局下沉到「区域」tab 底部。顶栏只留 撤销/重做 + 草稿状态 + 保存草稿 + 发布。原先「恢复经典布局」只在
   `!isDirty` 时出现、一改动就被「放弃更改」顶掉，同一块像素两种语义。
4. **设备切换标签走 i18n**：`viewportDesktop/Tablet/Mobile`，原为硬编码
   `'Desktop'/'Tablet'/'Mobile'` 同时喂给 aria-label 和 title，中文店铺 hover 与读屏都是英文。
5. **ThemeEditor 改单开手风琴**（`ThemeGroupSection`）：配色/字体/圆角三组，默认只开配色。原先三个列表平铺，光字体就 9 项，改圆角要滚过整屏。
6. **新增全屏预览**（`FullscreenPreview.tsx`）：预览工具栏右侧入口，走买家侧同一个
   `SectionRenderer`。刻意做成页内浮层而非新标签页——新标签只能加载**已保存**的草稿，会悄悄丢掉卖家最后一次编辑。顶部横幅区分「草稿预览 · 买家看到的仍是已发布版本」与「预览的是当前已发布的店铺」。

**顺带修掉的两个非本模块 bug（调试 demo 时撞上）：**

- `AuthProvider.tsx` 的 `await restoreSession()` 无 try/catch 且 `setIsInitialized(true)`
  在其后 —— 任何抛错（畸形 token、节点不响应）都会让**整站永久卡在全屏 spinner**，无提示、刷新无效。已改 try/catch/finally。
- `next.config.js` 补 `allowedDevOrigins`：Next 16 会把 `127.0.0.1`（dev
  server 绑 localhost 时）当跨域并拦掉 dev chunk，触发 `layout.tsx` 的 ChunkLoadError 守卫 →
  `location.reload()` 死循环 → 白屏且无任何报错。按 IP 或局域网地址调试都会中招。

### 8.2 Demo 录制

`pnpm demo:storefront`（`playwright.demo.config.ts` + `e2e/storefront-editor.demo.spec.ts`），产出
`apps/web/demo-output/storefront-editor-demo.{webm,mp4}`（已 gitignore）。1440×900、带中文字幕条、7 幕：主题 → 画布点选 →
**手动选品**（卖家报的问题）→ 撤销重做 → 全屏预览 → 草稿 → 发布确认。

所有 `/v1/*` 由 spec 内假 node 提供（8 商品 /
3 系列 / 草稿·线上双槽状态机），不需要起后端或 Casdoor 登录。

三个踩过的坑，改配置时别踩回去：

- **baseURL 必须和 dev server 同主机名**（都用
  `localhost`），否则触发上面那个 ChunkLoadError 重载死循环。
- **`viewport` 要写在 `devices['Desktop Chrome']`
  展开之后**，否则设备预设自带的 1280×720 会覆盖它，成片带灰边。
- **落盘用 `video.saveAs()`，不能 `fs.copyFileSync(await video.path())`**
  —— 后者拷到的是未写完的文件，结尾几幕会丢（表现为 ffmpeg 报
  `File ended prematurely`、时长比实际短 10 秒）。

---

## 0. 结论摘要

PG-201 的**底层架构是对的**（JSON 配置驱动 + discriminated union +
SSR 渲染 + 主题令牌），不需要重写。差距集中在**编辑体验层**和**内容供给层**：

1. **P0 断层**：5 类 Section 的「手动/内容」模式在编辑器里没有对应的选择器，卖家选了模式后无路可走（真实用户已撞上）。
2. **预览失真**：编辑器预览用 `peerId="preview"` 渲染占位虚框，卖家保存前看不到真实商品和真实效果。
3. **素材断供**：所有图片字段是裸 URL 文本框，没有上传/媒体库，普通卖家拿不到一个可用的图片 URL。
4. **范式落后**：表单优先（左侧手风琴改字段）而非画布优先（点预览选中、就地编辑），与 Shopify OS 2.0
   / Wix / Squarespace 的交互范式差一代。
5. **默认效果差**：默认 hero 是纯黑色块 + 「欢迎光临」，信任标识是 emoji 图标——开箱即视感直接决定采纳率。

规划分四期：**V2-P0 断层修复（立刻）→ V2-P1 画布优先编辑 → V2-P2 模板与视觉品质 → V2-P3
AI 深度整合**。

---

## 1. 现状梳理

### 1.1 架构与数据流（评价：健康，保留）

```
卖家 Admin (/admin/storefront)
  └─ StoreBrandingEditor (apps/web/src/components/store-editor/)
       ├─ ThemeEditor          调色板/字体/圆角/头部样式
       ├─ SectionListEditor    @dnd-kit 拖拽排序 + 手风琴属性编辑 (SectionPropsEditor)
       ├─ AddSectionPicker / PresetPicker (8 套预设) / AIStoreBuilderDialog (PG-202)
       └─ 右侧内联预览: SectionRenderer + StoreThemeProvider, peerId="preview"
                │
                ▼ save (full replace)
  StoreConfig JSON  ── authPut NODE_API.SETTINGS_STOREFRONT（节点 settings）
                │
                ▼ 公开读
  买家店铺页 store/[peerId]/page.tsx + 独立站首页 app/page.tsx
  （节点在线走 Node API；离线回退搜索服务 store_metadata）
```

- `StoreConfig { version, status, theme, sections[] }`，15 种 Section 类型，
  `packages/core/types/storeConfig.ts`，`MAX_SECTIONS = 20`。
- SSR SEO（generateMetadata 取 hero 标题）、next/font 预加载、对比度安全色，均已落地。
- 校验器 `packages/core/utils/storeConfigValidator.ts` 存在。

**这套「settings schema + section 渲染器」本质上就是 Shopify 主题架构的简化版，方向正确。**
V2 全部工作应建立在其上，而不是推倒。

### 1.2 编辑器交互现状

- 左窄栏（320–384px）双 Tab（主题/区域），右侧预览可切 desktop/tablet/mobile 视口。
- Section 编辑 = 手风琴展开后的一组 TextInput/Select/Toggle（`SectionPropsEditor.tsx`，648 行 switch）。
- 脏状态 = 单一 draft 副本；只有「放弃全部」，**无 undo/redo**。
- Schema 里有 `status: 'draft' | 'published'`，但编辑器**没有草稿/发布工作流**，保存即上线。
- 预览与列表无联动：点预览选不中 Section，改字段预览不滚动定位。

---

## 2. 问题清单（按严重度）

### S1 — 功能断层（卖家会卡死，P0 修复）

| #   | 位置                     | 断层                                                                                                               |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | `FeaturedProductsEditor` | 提供 `mode: manual`，但 **没有商品选择器**——`productSlugs` 在 UI 上无处编辑。手动模式 = 空区块。**（用户已反馈）** |
| 2   | `CollectionsEditor`      | `mode: manual` 同样没有 `collectionIDs` 选择器                                                                     |
| 3   | `TestimonialsEditor`     | `mode: manual` 没有 items（姓名/评语/评分）编辑器                                                                  |
| 4   | `TrustBadgesEditor`      | badges 数组不可编辑，只显示「5 个徽章」文案；卖家不能增删改任何徽章                                                |
| 5   | `GalleryEditor`          | 图片墙 **没有任何图片管理 UI**，只显示「N image(s)」                                                               |

共性根因：`SectionPropsEditor` 只做了标量字段（string/number/enum/bool）的通用表单，
**数组型 / 资源引用型属性没有对应控件**（FAQ 是唯一做了 item 列表编辑的特例）。

### S2 — 体验硬伤（可用但离生产远）

| #   | 问题                 | 现状                                                                                                                                                                      |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | 预览是假的           | `peerId="preview"` → FeaturedProducts/ProductGrid/Collections 全部渲染虚线占位框（截图 2 里的空「精选商品」卡即此）。卖家保存前看不到真实店铺的样子；「所见即所得」不成立 |
| 7   | 图片无上传           | hero 背景、about 图、gallery、video poster 全是 `https://...` 裸文本框。商品发布已有图片上传管线，此处未复用                                                              |
| 8   | 无画布交互           | 不能点预览选中 Section；不能就地改文字；列表与预览无滚动/高亮联动                                                                                                         |
| 9   | 无 undo/redo         | 误删 Section 只能整体放弃                                                                                                                                                 |
| 10  | 保存即上线           | schema 支持 draft/published，编辑器没有「保存草稿→预览链接→发布」流                                                                                                       |
| 11  | 原始输入             | countdown 目标时间要求手填 ISO 字符串；rich-text 是裸 HTML textarea                                                                                                       |
| 12  | Section 无自定义命名 | 列表只显示类型名，两个同类 Section 无法区分                                                                                                                               |

### S3 — 视觉与内容品质（决定「离生产的差距」观感）

| #   | 问题               | 现状                                                                             |
| --- | ------------------ | -------------------------------------------------------------------------------- |
| 13  | 默认 hero 是黑色块 | 无背景图时 overlay 直接盖纯色，观感像故障（截图 2 的大黑块）                     |
| 14  | emoji 图标体系     | 信任标识/Section 图标用 emoji（🛡💰🏠🤝🔒），跨平台渲染不一致、廉价感            |
| 15  | 预设模板同质化     | 8 套预设 = 同一批 Section 换配色字体，缺行业化模板（数码/服饰/数字商品/收藏卡…） |
| 16  | 空状态无引导       | 商品为空/未配置时直接空白或占位框，无「去添加商品」「换自动模式」引导            |

---

## 3. 业界对标与趋势

### 3.1 Shopify OS 2.0 主题编辑器（第一对标）

| 能力         | Shopify                                                    | 我们现状            |
| ------------ | ---------------------------------------------------------- | ------------------- |
| 画布优先     | 点击预览中的 Section 即选中，右/左侧出现上下文设置面板     | 只能从列表进入      |
| 资源选择器   | Product/Collection/Image Picker 统一模态（搜索+多选+排序） | 无                  |
| 真实数据预览 | 预览就是真店渲染                                           | 占位虚框            |
| 媒体库       | 上传 + 已有素材 + 免费图库                                 | 裸 URL              |
| 草稿/发布    | 主题库、预览链接、定时发布                                 | 保存即上线          |
| undo/redo    | 完整历史栈                                                 | 无                  |
| Blocks 嵌套  | Section 内可增删排序 block                                 | 仅 FAQ 有 item 列表 |

### 3.2 Wix / Squarespace / Framer 补充信号

- **就地编辑**：文字直接在画布上点击输入，表单只承载非文本属性。
- **AI 起步（Wix ADI、Squarespace Blueprint、Shopify
  Magic）**：AI 生成初稿已是行业默认入口——我们 PG-202 已有，但输入只有品牌名+描述，**没有喂入卖家真实商品目录**，生成结果与店铺内容脱节。
- **移动优先预览**：移动视口是默认或强提示（多数买家流量在移动端/TMA）。
- **设计令牌化**：颜色按语义角色（背景/前景/强调）而非孤立色值——我们的 palette 机制已接近，补齐角色映射即可。

### 3.3 对 Mobazha 的特殊约束

- 节点可离线（配置回退搜索服务缓存）→ 预览与发布要考虑「节点在线才可保存」的错误路径。
- 多渠道渲染：同一配置服务于 SaaS 店铺页、独立站首页、（未来）Telegram Mini
  App——Section 设计需保持渠道无关，TMA 的受限视口是 V2-P2 的显式验收项。
- Web3 信任叙事是差异化卖点：信任标识 Section 值得做成精品（真实托管/结算能力驱动，而非静态文案）。

---

## 4. 目标体验（North Star）

> 卖家打开店铺外观页，看到**自己真实店铺**的实时渲染；点击画布上任何区块即选中并出现设置面板；需要商品/系列/图片时弹出统一选择器（含上传）；随时撤销；改完存草稿拿预览链接，确认后一键发布。冷启动走「AI 用我的真实商品生成首稿 → 微调 → 发布」，5 分钟内得到一个不输 Shopify 免费主题的门面。

---

## 5. 分期规划

### V2-P0 — 断层修复与真实预览（最高优先级，直接回应用户反馈）

**目标**：消灭所有「选了模式没有下文」的死路；预览显示真实数据。

1. **ResourcePicker 组件族**（一次建设，处处复用）
   - `ProductPicker`：搜索 + 缩略图多选 + 已选排序，数据源
     `productDataService.getStoreListings(peerId)`（已存在）。
   - `CollectionPicker`：同型，数据源现有 collections API。
   - 接入点：FeaturedProducts（manual）、Collections（manual）；编辑器内在 mode=manual 时展示「选择商品（N）」按钮 + 已选清单。
2. **数组属性编辑器泛化**：把 FAQ 的 item-list 模式抽成通用 `ItemListEditor`，落地到 Testimonials
   items、TrustBadges badges、Gallery images。
3. **真实数据预览**：编辑器预览传真实
   `peerId`（owner 已登录，数据可得），仅对确无数据的情况保留占位态；占位态附引导 CTA（如「暂无商品 → 去添加」）。
4. **图片字段升级**：`ImageInput` = 上传（复用商品图片上传管线）+
   URL 粘贴 + 预览缩略图，替换 hero/about/gallery/video 的裸文本框。
5. **微修**：countdown 用日期时间控件；Section 支持自定义显示名；manual 模式下商品数 `count`
   字段隐藏（数量由所选决定，避免歧义）。

**验收**：卖家从「模式=手动」出发，三次点击内完成商品挑选并在预览中看到真实商品卡。

### V2-P1 — 画布优先编辑范式

1. **点选联动**：预览中 Section
   hover 高亮 + 点击选中 → 左栏自动展开对应属性面板；列表点击 → 预览滚动定位。（编辑器预览包一层
   `EditableSectionBlock`，不污染买家侧渲染器。）
2. **undo/redo**：draft 历史栈（immer patches 或快照数组，config 体量小，快照即可）。
3. **草稿/发布工作流**：启用 schema 中已有的
   `status`；保存草稿不影响线上；生成带 token 的预览链接可分享；「发布」为显式动作。后端需支持 draft/published 双份存取（settings
   key 扩展）。
4. **就地文本编辑**（可选子项）：hero 标题/副标题、announcement 文本在画布上 contentEditable 直改。
5. **移动预览升格**：默认进入时按流量来源提示移动视口；TMA 视口预设加入。

### V2-P2 — 模板与视觉品质

1. **默认配置重做**：hero 无图时用主题色渐变 + 图案纹理，不再出现黑块；出厂即好看。
2. **图标体系**：emoji → lucide/自绘 SVG 集（TrustBadge icon 枚举已预留 `custom`，向后兼容）。
3. **行业模板库**：6–8 套「垂直行业」模板（数码、潮玩/收藏卡、数字商品、服饰、食品、服务），每套含真实感示例文案与图片位指导；模板选择时用真实商品填充预览。
4. **Section 表现力**：hero 支持渐变/视频背景与多布局变体；featured 支持轮播变体；信任标识与真实能力联动（托管方式、支持币种、发货 SLA 从店铺配置读取）。
5. **主题令牌角色化**：primary/secondary/accent → 语义角色映射 + 自动对比度校验 UI 提示。

### V2-P3 — AI 深度整合（对齐 2026 趋势）

1. **AI 首稿用真实目录**：`generateStoreConfig`
   输入扩展为品牌信息 + 抽样商品（标题/类目/图），生成的 featured/collections 直接引用真实 slug；文案语言跟随店铺主语言。
2. **单点 AI 助笔**：每个文本字段旁「✨ 改写」；hero/about 一键生成三个候选。
3. **对话式微调**（探索）：接入现有 AI 助手侧栏，「把主色调改成暖色、精选商品换成新到」直接产出 config
   diff 预览。

### 明确不做（本轮）

- 自由画布/绝对定位（保持 Section 流式模型，复杂度不换收益）。
- 第三方主题市场、自定义 CSS/Liquid 级扩展。
- 多主题库并存（先做单配置 draft/published 双态）。

---

## 6. 成功指标（沿用并收紧 PG-201 目标）

| 指标           | 目标                                                          |
| -------------- | ------------------------------------------------------------- |
| 手动精选完成率 | 选择 manual 模式的卖家 90%+ 成功保存非空商品清单（当前 ≈ 0%） |
| 编辑器求助率   | 店铺外观相关客服/群求助显著下降（以本次微信反馈为基线事件）   |
| 自定义采纳率   | 14 天内 >30%（PG-201 原目标，未达则本轮为主要抓手）           |
| 首次保存时长   | <5 分钟；AI 路径 <2 分钟                                      |
| 预览真实度     | 编辑器预览与线上渲染像素级同源（同一渲染器、真实数据）        |

---

## 7. 实施与风险备注

- **触点仓库**：主体在 `mobazha-unified`（store-editor / store-sections / core
  types+services）；草稿/发布双态与预览 token 需要节点侧 settings API 小幅扩展（mobazha 仓库）。
- **兼容性**：StoreConfig 保持 version=1 追加可选字段；已保存配置无迁移。
- **风险**：真实数据预览依赖节点在线——离线时降级为占位 + 明确提示，不得静默假预览；就地编辑（P1-4）实现成本最高，可独立砍掉不影响其余项。
- **顺序刚性**：P0 不依赖任何后端改动（草稿/发布除外，已放 P1），可立即开工。
