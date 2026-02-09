---
name: api-reference
description: Look up Mobazha backend API endpoints, request/response formats, and field mappings. Use when implementing API calls, debugging API errors, checking data structures, or when the user asks about API endpoints, backend structure, "API 接口", "后端接口", "字段映射", "数据结构".
---

# Mobazha API Reference

## Architecture

```
[Frontend] → [mobazha_hosting (gateway)] → [mobazha3.0 (core node)]
                    ↓
             Some APIs handled directly
             Some APIs proxied
```

- **mobazha_hosting**: Hosting gateway — user management, group marketplace
- **mobazha3.0**: Core P2P node — orders, products, wallets

## Backend Source Locations

### mobazha3.0 (Core Node — P2P)

| Data Type        | File Path                          | Notes                    |
| ---------------- | ---------------------------------- | ------------------------ |
| Purchase         | `pkg/models/purchase.go`           | Order creation request   |
| PurchaseItem     | `pkg/models/purchase.go`           | Order item               |
| ListingMetadata  | `pkg/models/listings.go`           | Product index (with CID) |
| API Routes       | `internal/api/gateway.go`          | Route definitions        |
| Order Handlers   | `internal/api/order_handlers.go`   | Order API                |
| Listing Handlers | `internal/api/listing_handlers.go` | Product API              |
| Protobuf Defs    | `pkg/orders/mbzpb/`                | 订单/商品/通用 proto     |

### mobazha_hosting (Cloud Gateway)

| Data Type         | File Path                          | Notes                         |
| ----------------- | ---------------------------------- | ----------------------------- |
| Gateway Router    | `api/gateway.go`                   | `newHostingRouter()` 路由注册 |
| Login Handlers    | `api/login*.go`                    | Telegram/Discord/Web 登录     |
| Group Marketplace | `api/group_*.go`                   | 群组集市 API                  |
| Account Binding   | `api/account_handlers.go`          | 多平台账号绑定                |
| Encryption API    | `internal/services/encryption*.go` | Phase2 加密密钥管理           |
| Relay Service     | `internal/services/relay*.go`      | Gas-less 交易中继             |
| Node Lifecycle    | `host/`                            | 节点创建/启动/GC              |

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

## Common Field Mapping

| Frontend            | Backend             | Notes                  |
| ------------------- | ------------------- | ---------------------- |
| `address.name`      | `shipTo`            | Recipient name         |
| `address.street`    | `address`           | Address line           |
| `address.country`   | `countryCode`       | Country code           |
| `quantity` (number) | `quantity` (string) | Must convert to string |
| `listingHash`/`cid` | `listingHash`       | Must be CID            |
