---
name: api-reference
description:
  Look up Mobazha backend API endpoints, request/response formats, and field mappings. Use when
  implementing API calls, debugging API errors, checking data structures, or when the user asks
  about API endpoints, backend structure, "API 接口", "后端接口", "字段映射", "数据结构".
---

# Mobazha API Reference

## Architecture

```
[Frontend] → [mobazha_hosting (gateway)] → [mobazha (core node)]
                    ↓
             Some APIs handled directly
             Some APIs proxied
```

- **mobazha_hosting**: Hosting gateway — user management, group marketplace
- **mobazha**: Core P2P node — orders, products, wallets

## Frontend API Layer

API 服务文件通过三层 helpers（`packages/core/services/api/helpers.ts`）统一路由，不直接调用
`getGatewayUrl()` / `getAuthHeaders()`。

| 层      | 函数前缀  | 路由目标                         | 用途                                            |
| ------- | --------- | -------------------------------- | ----------------------------------------------- |
| Layer 1 | `auth*`   | `getMyGatewayUrl()` — 按角色路由 | 认证端点（orders, wallet, chat, notifications） |
| Layer 2 | `public*` | `getGatewayUrl()` — 始终本地节点 | 公开数据（listings, profiles, exchange rates）  |
| Layer 3 | `search*` | `getSearchUrl()` — 搜索服务      | 搜索/发现（trending, featured）                 |

**认证**：`getAuthHeaders()` 从 `getStoredToken()` 获取 token（Bearer 或 `basic:` 前缀）。已移除
`authCredentials` 和 `username/password` 参数。

**独立站角色路由**：`getMyGatewayUrl()` 对独立站买家返回 `getBuyerGatewayUrl()`（→
SaaS），其他角色返回 `getGatewayUrl()`（→ 本地节点）。

**mobazha 后端**：Auth 中间件按路由粒度应用（`auth()` 闭包），公开路由无需认证。

## Backend Source Locations

### mobazha (Core Node — P2P)

| Data Type        | File Path                          | Notes                    |
| ---------------- | ---------------------------------- | ------------------------ |
| Purchase         | `pkg/models/purchase.go`           | Order creation request   |
| PurchaseItem     | `pkg/models/purchase.go`           | Order item               |
| ListingMetadata  | `pkg/models/listings.go`           | Product index (with CID) |
| API Routes       | `internal/api/gateway.go`          | Route definitions        |
| JWT Validator    | `internal/api/jwt_validator.go`    | Standalone JWT auth      |
| Cert Fetcher     | `internal/net/cert_fetcher.go`     | SaaS cert retrieval      |
| Order Handlers   | `internal/api/order_handlers.go`   | Order API                |
| Listing Handlers | `internal/api/listing_handlers.go` | Product API              |
| Protobuf Defs    | `pkg/orders/mbzpb/`                | 订单/商品/通用 proto     |

### mobazha_hosting (Cloud Gateway)

| Data Type         | File Path                                   | Notes                         |
| ----------------- | ------------------------------------------- | ----------------------------- |
| Gateway Router    | `api/gateway.go`                            | `newHostingRouter()` 路由注册 |
| Login Handlers    | `api/login*.go`                             | Telegram/Discord/Web 登录     |
| Group Marketplace | `api/group_*.go`                            | 群组集市 API                  |
| Account Binding   | `api/account_handlers.go`                   | 多平台账号绑定                |
| Encryption API    | `internal/services/encryption*.go`          | Phase2 加密密钥管理           |
| Relay Service     | `internal/services/relay*.go`               | Gas-less 交易中继             |
| Node Lifecycle    | `host/`                                     | 节点创建/启动/GC              |
| Store Registry    | `db/store_registry.go`                      | 独立站注册/心跳/CRUD          |
| Store Reg API     | `api/store_registry_handlers.go`            | 注册/心跳端点                 |
| Cross-Store Proxy | `api/cross_store_proxy.go`                  | 四级路由代理中间件            |
| HTTPS Proxy       | `internal/services/store_proxy.go`          | Level 2 HTTPS 反向代理        |
| LibP2P Proxy      | `internal/services/libp2p_proxy.go`         | Level 3 LibP2P stream 代理    |
| Standalone Bind   | `api/standalone_bind_handlers.go`           | OAuth 绑定流程                |
| Auth Certificate  | `api/gateway.go` `handleGETAuthCertificate` | Casdoor 公钥端点              |

### mobazha.info (Data Sync & Search)

| Data Type        | File Path                                  | Notes                    |
| ---------------- | ------------------------------------------ | ------------------------ |
| Server + Routes  | `backend/internal/api/server.go`           | `setupRoutes()` 路由注册 |
| Search Handlers  | `backend/internal/api/search_handlers.go`  | 商品搜索                 |
| Listing Handlers | `backend/internal/api/listing_handlers.go` | 商品索引                 |
| Profile Handlers | `backend/internal/api/profile_handlers.go` | 用户资料                 |
| NetDB Handlers   | `backend/internal/api/netdb_handlers.go`   | P2P 网络数据库           |
| Signature Verify | `backend/internal/api/middleware.go`       | NetDB 签名验证           |
| SQLC Queries     | `backend/internal/db/sqlc/queries/`        | 类型安全 SQL 查询        |
| Sphinx Search    | `backend/internal/services/sphinx.go`      | 全文搜索引擎             |

For complete API endpoint tables and data structures, see [reference.md](reference.md).

## Critical Field Notes

- `listingHash` must be a CID (e.g. `QmXxxx...`), NOT a slug
- `quantity` must be a string, not a number
- Address fields are flat (not nested objects)
- No `vendorId` field — backend resolves from `listingHash`
- Product detail API doesn't return CID — get it from `listingindex`

## Storefront Config API (PG-201)

Store 品牌化配置端点，后端存储在 NodeSettings（key=`store_config`）。

| Method | Route                              | Auth        | Description                                              |
| ------ | ---------------------------------- | ----------- | -------------------------------------------------------- |
| GET    | `/v1/settings/storefront`          | Yes (owner) | 获取当前用户的 StoreConfig（含 draft）                   |
| PUT    | `/v1/settings/storefront`          | Yes (owner) | 全量替换 StoreConfig（后端做 JSON 结构校验，100KB 限制） |
| GET    | `/v1/settings/storefront/{peerID}` | No (public) | 获取指定店铺的 StoreConfig（仅 `status=published`）      |

**前端 API 路径常量**：`packages/core/config/apiPaths.ts` → `NODE_API.SETTINGS_STOREFRONT` /
`NODE_API.SETTINGS_STOREFRONT_PUBLIC(peerID)`

**响应格式**：标准 `{ data: StoreConfig }` 信封。公开端点返回 `null`（无配置时 404）。

**类型定义**：`packages/core/types/storeConfig.ts`（Discriminated Union）。

详细 Schema 见 `docs/features/PG-201_STORE_BRANDING_DESIGN.md`。

## Common Field Mapping

| Frontend            | Backend             | Notes                  |
| ------------------- | ------------------- | ---------------------- |
| `address.name`      | `shipTo`            | Recipient name         |
| `address.street`    | `address`           | Address line           |
| `address.country`   | `countryCode`       | Country code           |
| `quantity` (number) | `quantity` (string) | Must convert to string |
| `listingHash`/`cid` | `listingHash`       | Must be CID            |
