# 卖家联盟计划 (Seller Affiliate)

## 功能 ID

`FEAT-SELLER-AFFILIATE-001`

## 功能描述

每个卖家可以开启一个店铺级的推广计划：设定佣金比例和归因窗口，生成推广者个人链接。买家通过推广链接下单后，佣金随订单资金在终态结算时自动分账给推广者（在已支持的加密货币结算 rail 上，作为同一释放交易的多输出之一，或 Guest
UTXO 场景下由同一冻结结算计划驱动的拆分 sweep）。

这是**卖家出资的订单资金结算内自动分账**，不是平台型余额、托管或独立 payout 产品。前端只做归因、聚合和可追溯展示；后端
`SettlementAction` 及链上 observed output 才是结算事实权威。

## 三条用户旅程

### 卖家 (Seller)

入口：`/admin/deal-links`

- `SellerAffiliateProgramPanel`：启用/暂停店铺级计划、设置佣金比例与归因窗口天数
- `SellerAffiliateStatementsPanel audience="seller"`：查看订单级 commission 与结算状态
- "获取推广者链接" 跳转 `/promote/:programId`

### 推广者 (Promoter)

- `/promote/:programId`：需登录；创建或复用个人推广链接（`ensureLink`
  对已存在的 active 链接是幂等的，不会重复创建），复制/原生分享
- `/promote/commissions`：需登录；查看自己的 `SellerAffiliateStatementsPanel audience="promoter"`

### 买家 (Buyer)

- `/promo/:token`：解析推广链接 token → 校验 program 状态（`active`
  才写入）→ 创建并写入 seller-scoped 的 referral session（`sessionStorage`）→ 跳转浏览该卖家店铺
- Deal Link checkout（`useDealLinkCheckout`）与 Guest
  Checkout（`guest-checkout/buildOrderRequest`）在下单时携带
  `affiliateReferralSessionID`，且只在 referral 所属卖家与当前订单卖家一致时才携带
- 普通（非推广）checkout 不受影响，不新增字段

## 路由与组件

| 路由                   | 页面                                            | 说明                                     |
| ---------------------- | ----------------------------------------------- | ---------------------------------------- |
| `/admin/deal-links`    | `apps/web/src/app/admin/deal-links/page.tsx`    | 卖家管理入口，含 Program/Statements 面板 |
| `/promote/:programId`  | `apps/web/src/app/promote/[programId]/page.tsx` | 推广者个人链接页                         |
| `/promote/commissions` | `apps/web/src/app/promote/commissions/page.tsx` | 推广者佣金对账页                         |
| `/promo/:token`        | `apps/web/src/app/promo/[token]/page.tsx`       | 买家推广入口，落地生成 referral session  |

组件：

- `apps/web/src/components/SellerAffiliate/SellerAffiliateProgramPanel.tsx`
- `apps/web/src/components/SellerAffiliate/SellerAffiliateStatementsPanel.tsx`

`routes.tsx` 中 Next.js 页面路径已在 full 与 sovereign (mini app) 两套路由表中重复登记，保持一致。

## Referral 本地存储与卖家范围

`packages/core/utils/sellerAffiliateReferral.ts`：

- 存储位置：`sessionStorage`，key `mobazha:seller-affiliate-referral`
- `writeSellerAffiliateReferralSession` 拒绝写入已过期的 session
- `readSellerAffiliateReferralSession` 在读取时发现已过期或 JSON 损坏会自动清除并返回 `null`
- `referralSessionForSeller(sellerPeerID)` 只在存储的 session 与传入的 `sellerPeerID`
  一致时才返回它——这是"referral 只附加给同一卖家"的唯一判定点，Deal Link checkout 和 Guest
  Checkout 都通过它（或等价的卖家比对）来决定是否携带 `affiliateReferralSessionID`
- Deal Link
  checkout（`useDealLinkCheckout`）额外在收到 acceptance 错误时，仅当错误与 affiliate/referral 相关（400/404/409/410 且错误信息包含 "affiliate" 或 "referral"）才清除本地 session，避免把无关错误（如 quote 过期）误判为 referral 失效

## Commission 状态 vs 展示状态

后端 commission 业务状态只有两种，`earned` 已删除且不得恢复：

```ts
type SellerAffiliateCommissionStatus = 'pending' | 'reversed';
```

前端展示状态由 commission 状态与 settlement 投影共同派生：

```ts
type SellerAffiliateDisplayStatus = 'pending' | 'settling' | 'paid' | 'reversed';
```

派生规则（`packages/core/utils/sellerAffiliate.ts` 的 `deriveSellerAffiliateDisplayStatus`）：

1. `settlement.state === 'confirmed'` → `paid`（**优先于** commission 的 reversed
   —— 已确认的链上分账不可逆转，这是后端不变量）
2. 否则 `commissionLine.status === 'reversed'` → `reversed`
3. 否则 `settlement.state` 为 `planned` 或 `submitted'` → `settling`
4. 其余 → `pending`

如果后端载荷出现 `confirmed` 且 commission 为 `reversed`
的矛盾（正常情况下不应发生），前端仍以不可撤销的链上事实显示为 `paid`，并通过现有
`errorTracker.captureMessage`（`reportSellerAffiliateContractAnomaly`）上报契约异常，而不是新建人工处理流程。

### 订单级分组

`groupSellerAffiliateStatementLines` 按 `orderID + currency` 聚合同一订单的多条 commission line：

- commission 金额用 `BigInt` 累加（同一订单可能有多个 `orderLineID`）
- 同一 settlement 可能投影到多条 line 上，分组后只展示一次，不重复计入 settlement 金额或 tx
- 分组状态：任一 line 为 `paid` → 分组 `paid`；否则全部 `reversed` → 分组 `reversed`；否则 active
  line 中出现 `settling` → 分组 `settling`；否则 `pending`
- 若同一订单出现 reversed 与 active（非 reversed）混合 line，视为契约异常，同样通过
  `reportSellerAffiliateContractAnomaly` 上报

## Settlement DTO 与 OpenAPI

Core 的 statement line 携带一个 **optional** 的 `settlement` 投影：

```json
{
  "actionId": "...",
  "action": "complete | confirm | dispute_release | guest_release",
  "state": "planned | submitted | confirmed",
  "txHash": "...",
  "coin": "canonical asset id",
  "amount": "atomic integer",
  "address": "...",
  "confirmations": 3,
  "updatedAt": "...",
  "confirmedAt": "..."
}
```

- Core `submitting` 状态对外投影为 `planned`
- `confirmed` 必须存在与冻结地址 + planned amount 匹配的 observed affiliate
  output；不匹配则不会投影为 `confirmed`
- 前端 normalizer：`packages/core/utils/sellerAffiliate.ts` 的
  `normalizeSellerAffiliateStatementLine` / `normalizeSettlementOutput`

**Release
Gate（发布前必须解决）**：截至本次改动，`Platform_AffiliateStatementLine`（`packages/core/api-spec/openapi.json`）与生成的
`packages/core/types/api-generated.d.ts` 尚未包含 `settlement` 字段——Hosting 的 `go.mod`
固定的 Core 版本早于 settlement
projection 相关提交。当前前端使用手写的 optional 类型与 normalizer 兼容工作，**不能**将 `paid`
状态对外宣称为已完成生产闭环，直到：

1. Hosting 升级到包含 settlement projection 的 Core 版本并重新生成 OpenAPI；
2. Unified 运行 `pnpm openapi` / `pnpm openapi:check` 同步 generated types；
3. Hosting OpenAPI 守护测试扩展为断言 `AffiliateStatementLine.properties.settlement` 存在。

## 自动刷新（低频轮询）

`useSellerAffiliateStatements`（`packages/core/hooks/useSellerAffiliateStatements.ts`）：

- 仅当至少一条 statement line 的 `settlement.state` 为 `planned` 或
  `submitted`（即确实有在途结算）时才轮询，默认间隔 12 秒
- 页面 `document.visibilityState !== 'visible'` 时暂停；恢复可见时立即刷新一次
- 用 ref 做单飞（in-flight）防抖，避免并发请求；组件卸载后不再 `setState`
- 全部 line 变为 `confirmed`/`reversed`（不再有在途结算）或没有任何 settlement 时自动停止

## 加密货币支持矩阵

| Rail                                           | 分账支持                                     |
| ---------------------------------------------- | -------------------------------------------- |
| Safe 标准订单                                  | 已实现                                       |
| BTC/BCH/LTC UTXO 标准订单                      | 已实现                                       |
| Guest UTXO（同一冻结结算计划驱动的拆分 sweep） | 已实现                                       |
| Guest EVM Safe                                 | **尚未支持**（后端缺口，前端不得暗示已支持） |

## 明确不做的事

- 没有 `earned` commission 状态（已删除，禁止恢复）
- 没有独立 payout engine、平台余额、claim/withdraw、人工审核队列或运营打款后台
- 不承诺"所有加密货币路径都已闭环"，只承诺"已支持的 settlement rail 会自动分账"
- 不展示内部 `actionID`；推广者/买家地址默认不作为主信息展示

## 测试入口

- `packages/core/__tests__/utils/sellerAffiliate.test.ts`
  — 状态派生（含 confirmed 优先于 reversed 的契约异常上报）、订单级分组聚合
- `packages/core/__tests__/utils/sellerAffiliateReferral.test.ts` — referral
  session 存取、过期、损坏 JSON、同卖家范围
- `packages/core/__tests__/utils/dealLink.test.ts` — `buildDealLinkAcceptanceRequest`
  携带/省略 referral
- `apps/web/__tests__/hooks/useSellerAffiliateStatements.test.ts` — 轮询启动/暂停/恢复/单飞/卸载停止
- `apps/web/__tests__/hooks/useDealLinkCheckout.affiliate.test.ts`
  — 同卖家携带、跨卖家不携带、错误清理
- `apps/web/__tests__/app/guest-checkout/buildOrderRequest.test.ts` — Guest
  Checkout 携带/省略 referral
- `apps/web/__tests__/components/SellerAffiliate/SellerAffiliateStatementsPanel.test.tsx`
  — 四态、tx 详情、契约矛盾、分组去重
- `apps/web/__tests__/components/SellerAffiliate/SellerAffiliateProgramPanel.test.tsx`
  — 加载、校验、保存、错误、启用/暂停
- `apps/web/__tests__/app/promo/token.page.test.tsx`、`apps/web/__tests__/app/promote/programId.page.test.tsx`、`apps/web/__tests__/app/promote/commissions.page.test.tsx`

## 相关文档

- [i18n](./i18n.md)
- Hosting: `docs/economics/DEAL_COMMISSION_ARCHITECTURE_REMEDIATION_PLAN_ZH.md`（跨仓业务权威）
