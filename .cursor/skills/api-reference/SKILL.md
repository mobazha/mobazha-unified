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

| Data Type        | File Path                          | Notes                    |
| ---------------- | ---------------------------------- | ------------------------ |
| Purchase         | `pkg/models/purchase.go`           | Order creation request   |
| PurchaseItem     | `pkg/models/purchase.go`           | Order item               |
| ListingMetadata  | `pkg/models/listings.go`           | Product index (with CID) |
| API Routes       | `internal/api/gateway.go`          | Route definitions        |
| Order Handlers   | `internal/api/order_handlers.go`   | Order API                |
| Listing Handlers | `internal/api/listing_handlers.go` | Product API              |

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
