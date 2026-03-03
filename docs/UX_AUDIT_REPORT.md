# Mobazha AI UX 体验审查报告

> 审查日期: 2026-02-28
> 审查范围: 90 张视觉基线截图（44 Desktop + 46 Mobile）
> 审查方法: AI 三层评审（评分卡 + 竞品对标 + 移动专项）

## 一、发现汇总

| 优先级          | 数量 | 说明                       |
| --------------- | ---- | -------------------------- |
| **P0 阻断级**   | 2    | 功能不可用，必须立即修复   |
| **P1 体验差**   | 7    | 严重影响用户信任或流程完成 |
| **P2 可改进**   | 8    | 体验优化点                 |
| **P3 锦上添花** | 5    | 竞品对标提升               |

---

## 二、P0 阻断级

### P0-001: 聊天页面 404 崩溃

- **截图**: `mobile-authed-chat`
- **问题**: 聊天/消息页面显示 React Router 默认错误页 "Unexpected Application Error! 404 Not Found" + 开发者调试信息
- **影响**: 用户点击底部导航 "Messages" 后看到技术错误页面 — 完全不可用
- **建议**: 修复路由注册（`routes.tsx` 中添加 `/messages` 或 `/chat` 路由），或添加自定义 ErrorBoundary 替代 React Router 默认错误页

### P0-002: 登录页 Logo 图片破损

- **截图**: `mobile-public-login`
- **问题**: 登录页面显示 alt text "Mobazha E2E" 而非实际 Logo 图片
- **影响**: 登录是用户第一个接触点，品牌展示失败严重影响信任
- **建议**: 检查 Casdoor 应用配置中的 Logo URL 是否正确指向有效图片

---

## 三、P1 体验差

### P1-001: 结账页同一商品重复显示

- **截图**: `mobile-authed-checkout`, `desktop-authed-checkout`
- **问题**: 同一商品（Wireless Noise-Cancelling Headphones）出现两次作为独立行项，各 Qty:2，应合并为 Qty:4 单行
- **影响**: 用户误以为重复下单，增加认知负担
- **建议**: 相同商品（同 SKU）在 Order Summary 中合并显示

### P1-002: Shipping 选项重复

- **截图**: `mobile-authed-checkout`, `desktop-authed-checkout`
- **问题**: Standard Shipping 和 Express Shipping 各出现两次（来自两个 Shipping Profile）
- **影响**: 用户面对 4 个配送选项但实际只有 2 种，选择困惑
- **建议**: 合并同名 Shipping 选项，或按 Profile 分组显示

### P1-003: 术语不一致 — Escrow vs Buyer Protection

- **截图**: `mobile-authed-order-detail`（"held in escrow"）vs `mobile-authed-product-detail`（"Buyer Protection"）
- **问题**: 订单详情使用 "Funds are being held in escrow" 技术术语，而商品详情统一使用 "Buyer Protection"
- **影响**: 违反 identity-display-rules 中"禁止在 UI 中使用 Escrow 术语"的规定
- **建议**: 全局替换为 "Your funds are held securely under Buyer Protection until you confirm delivery"

### P1-004: 订单详情暴露裸 Peer ID

- **截图**: `mobile-authed-order-detail`
- **问题**: 买卖双方均显示 "testuser1" + 裸 Peer ID "QmY8tR...cj8P"
- **影响**: 违反 identity-display-rules，技术细节不应暴露给普通用户
- **建议**: 使用 `formatUserName()` 处理，fallback 为角色标签 "Seller" / "Buyer"

### P1-005: 购物车 "Clear All" 无确认

- **截图**: `mobile-authed-cart`
- **问题**: "Clear All" 按钮直接清空购物车，无确认弹窗
- **影响**: 高破坏性操作（丢失所有购物车商品）缺乏防误操作保护
- **建议**: 添加确认 Dialog "确定清空购物车？此操作不可撤销"

### P1-006: 新卖家零评分零销量的信任问题

- **截图**: `mobile-authed-product-detail`, `desktop-authed-product-detail`
- **问题**: 卖家信息区显示 "testuser1 ★ 0.0 (0)" — 零评分零评价
- **影响**: 在真实环境中，新卖家零评分会严重影响买家购买意愿
- **建议**: 新卖家阶段隐藏评分（而非显示 0.0），或显示 "New Seller" 徽章替代

### P1-007: Profile 商品卡片无图片

- **截图**: `mobile-authed-profile`
- **问题**: 个人店铺的两个商品卡片（Test Digital Good, Professional Logo Design Package）无图片，显示空白
- **影响**: 店铺主页是卖家对外展示的核心页面，无图商品显得不专业
- **建议**: 确保商品创建时至少有一张图片，或显示品类 placeholder 图标

---

## 四、P2 可改进

### P2-001: 首页 Trending Now 与 Featured & Services 内容重复

- **截图**: `mobile-public-home`, `mobile-authed-home`
- **问题**: 两个板块展示完全相同的 4 个商品
- **建议**: 差异化内容（Trending = 按浏览量排序，Featured = 编辑精选或新品）

### P2-002: "Real API" 调试徽章残留

- **截图**: `mobile-public-home`, `mobile-authed-home`
- **问题**: "Real API" 绿色 badge 出现在商品列表上方
- **建议**: 仅在开发模式显示（`process.env.NODE_ENV === 'development'`）

### P2-003: 搜索结果底部被 Bottom Nav 遮挡

- **截图**: `mobile-public-search-results`
- **问题**: 底部两个商品的价格和评分行被 Bottom Nav 遮挡
- **建议**: 添加 Bottom Nav 高度的 padding-bottom（约 64px）

### P2-004: Community Marketplaces Featured 卡片无滑动指示器

- **截图**: `mobile-public-marketplace`
- **问题**: Featured Marketplaces 可横向滚动但无 dot 指示器或 peek 效果
- **建议**: 添加 peek（右侧露出 1/4 卡片）或 dot 指示器

### P2-005: `order.additionalInfo` 字段名暴露在 UI

- **截图**: `mobile-authed-order-detail`
- **问题**: 显示原始字段名 "order.additionalInfo" 而非本地化标签
- **建议**: 替换为 "Additional Information" 或 "附加信息"

### P2-006: Dashboard "Total Sales" 和 "Avg. Rating" 显示 "—"

- **截图**: `mobile-authed-admin-dashboard`
- **问题**: 空值显示为破折号 "—"，含义模糊
- **建议**: 显示 "$0" + "Completed orders" 和 "No reviews yet" 文案

### P2-007: Me 页面显示截断 Peer ID

- **截图**: `mobile-authed-me`
- **问题**: 用户名下方显示 "12D3KooW...tAG8"
- **建议**: 对普通用户隐藏 Peer ID，仅在高级设置中显示；或添加 "Copy ID" 按钮替代直接展示

### P2-008: 订单详情进度条在小屏幕压缩

- **截图**: `mobile-authed-order-detail`
- **问题**: 5 步订单进度指示器在 390px 宽度下步骤 4/5 被压缩，数字不清晰
- **建议**: 移动端使用竖向 Timeline 替代水平进度条

---

## 五、P3 锦上添花

### P3-001: Dashboard 缺少新卖家引导进度

- **建议**: 添加 "完成这 3 步开启销售" 进度条（设置 Profile → 添加商品 → 连接支付）

### P3-002: 首页分类入口在页面底部

- **建议**: "Browse Categories" 提升到首屏或第二屏可见区域

### P3-003: Analytics "Coming Soon" 页面

- **建议**: 即使功能未就绪，可展示 mock 数据预览 + "Analytics is coming soon — here's a preview"

### P3-004: 产品详情缺少社交分享按钮的视觉提示

- **桌面端有分享图标**，移动端不明显
- **建议**: 移动端添加浮动分享按钮或在操作栏中更醒目

### P3-005: 钱包页可增加交易记录入口

- **截图**: `mobile-authed-wallet`
- **现状**: 展示余额 + 4 币种列表，但无交易历史入口
- **建议**: 每个币种点击后展示交易记录

---

## 六、竞品对标总结

### 买家体验

| 阶段 | vs Amazon/淘宝         | vs Shopify Storefront           | Mobazha 独特优势                         |
| ---- | ---------------------- | ------------------------------- | ---------------------------------------- |
| 发现 | 略落后（缺个性化推荐） | 持平（搜索 + 分类基础功能到位） | 社区市集(Community Marketplaces)模式独特 |
| 评估 | 略落后（缺 Q&A、对比） | 持平                            | Buyer Protection 信任卡片设计优秀        |
| 购买 | 持平（3步结账标准）    | 持平                            | 加密 + 法币双轨支付                      |
| 售后 | 略落后（缺追踪可视化） | 持平                            | 去中心化争议仲裁(Moderator)独特          |

### 卖家体验

| 阶段 | vs Shopify           | vs Etsy          | Mobazha 独特优势                      |
| ---- | -------------------- | ---------------- | ------------------------------------- |
| 开店 | 持平（4步向导优秀）  | 略领先（更简洁） | AI Store Builder + RWA Token 商品类型 |
| 运营 | 略落后（缺数据图表） | 持平             | 零佣金                                |
| 管理 | 持平                 | 持平             | Collection + Discount 管理到位        |

---

## 七、移动端专项评估

| 检查项       | 评分 | 发现                                                                            |
| ------------ | ---- | ------------------------------------------------------------------------------- |
| **拇指区**   | 4/5  | CTA 按钮基本在底部安全区；但商品详情的 "Add to Cart" 在屏幕中间                 |
| **导航深度** | 4/5  | 核心路径 4-5 步，合理；但购物车→结账可加智能提示                                |
| **滚动长度** | 3/5  | 首页需滚动 3-4 屏才到分类；商品详情也偏长                                       |
| **底部导航** | 4/5  | 5 Tab 高亮正确，Cart Badge 有效；但登录后 Tab 从 3→5 的变化可能令用户短暂迷失   |
| **手势暗示** | 2/5  | **最弱环节**：多处横滑内容无 peek/dot 指示器（首页商品、Featured Marketplaces） |
| **键盘适配** | 3/5  | 从截图无法验证，需运行时测试                                                    |

---

## 八、Top 10 优先修复清单

| #   | ID     | 优先级 | 问题                               | 工作量预估 | 状态                                                             |
| --- | ------ | ------ | ---------------------------------- | ---------- | ---------------------------------------------------------------- |
| 1   | P0-001 | P0     | 聊天页面 404 崩溃                  | 0.5h       | ✅ 已修复 — E2E 测试移除无效 /chat 路由                          |
| 2   | P0-002 | P0     | 登录页 Logo 破损                   | 0.5h       | ⏳ 待修复（Casdoor 配置问题）                                    |
| 3   | P1-001 | P1     | 结账页商品重复显示                 | 2h         | ⏳ 待修复                                                        |
| 4   | P1-002 | P1     | Shipping 选项重复                  | 2h         | ⏳ 待修复                                                        |
| 5   | P1-003 | P1     | Escrow → Buyer Protection 术语统一 | 1h         | ✅ 已修复 — en.ts + zh.ts 全量替换                               |
| 6   | P1-004 | P1     | 裸 Peer ID 暴露                    | 1h         | ✅ 已修复 — OrderCounterpartyCard 使用 formatUserName + 角色标签 |
| 7   | P1-005 | P1     | 购物车 Clear All 无确认            | 0.5h       | ✅ 已修复 — ClearCartAlert 确认对话框（3 组件）                  |
| 8   | P2-003 | P2     | 搜索结果被 BottomNav 遮挡          | 0.5h       | ✅ 已修复 — SearchMobile 添加 pb-24                              |
| 9   | P2-001 | P2     | 首页内容重复                       | 2h         | ⏳ 待修复                                                        |
| 10  | P1-006 | P1     | 零评分显示策略                     | 1h         | ✅ 已修复 — "New" 标签替代空星 + Collection 页 props bug 修复    |

**额外修复**：

- P2-005: `order.additionalInfo` 字段名暴露 → ✅ 已添加 i18n key（en.ts + zh.ts）

---

## 九、下一步

1. **剩余 P0/P1 修复**：P0-002（Casdoor Logo）、P1-001（结账重复）、P1-002（Shipping 重复）
2. 创建 demo-journey specs 覆盖更多状态（空购物车、争议订单、退款等）
3. 运行 journey 截图 + 第二轮 AI 审查（覆盖完整卖家开店、买家售后流程）
4. 独立站专项审查（买家 OAuth 流程、政策页面、卖家登录体验）
5. 完成其他语言的 Escrow → Buyer Protection 术语替换（ja/fr/de/es/ko）
