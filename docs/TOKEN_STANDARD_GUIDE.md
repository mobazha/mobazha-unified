# 统一代币标识标准指南

> 适用于 mobazha-unified、mobazha-desktop、mobazha-mobile 三个客户端

**版本**: 1.0  
**创建日期**: 2026-01-14  
**状态**: 已实施

---

## 概述

本指南规范 Mobazha 平台中所有 Web3 Token（含 RWA Token、NFT）的唯一标识、存储与解析策略。确保三个客户端之间的数据格式完全一致，便于跨平台功能复用与扩展。

### 设计目标

- **唯一性**：每个代币在系统中具有稳定、唯一的标识
- **可解析**：标识符包含完整信息，可逆向解析
- **跨客户端一致**：三个客户端使用相同的格式和工具函数
- **向后兼容**：支持解析旧格式标识

---

## 代币标识格式

### 存储字段

```
item.cryptoListingCurrencyCode
```

### 新格式（v2.0，推荐）

支持 ERC721、ERC1155、ERC3525 代币标准：

| Token 标准  | 格式                            | 组成                          |
| ----------- | ------------------------------- | ----------------------------- |
| **ERC721**  | `CHAIN_ADDRESS_ERC721_tokenId`  | 区块链*合约地址*标准\_tokenId |
| **ERC1155** | `CHAIN_ADDRESS_ERC1155_tokenId` | 区块链*合约地址*标准\_tokenId |
| **ERC3525** | `CHAIN_ADDRESS_ERC3525_slotId`  | 区块链*合约地址*标准\_slotId  |

#### 格式说明

| 组成部分             | 说明                    | 示例                                         |
| -------------------- | ----------------------- | -------------------------------------------- |
| `CHAIN`              | 区块链网络（大写）      | `SEPOLIA`, `ETH`, `BSC`                      |
| `ADDRESS`            | 合约地址（小写，含 0x） | `0xc7345ea65fd12cc3cad8f9991cfa46c13c0b1df8` |
| `STANDARD`           | 代币标准                | `ERC721`, `ERC1155`, `ERC3525`               |
| `tokenId` / `slotId` | 代币唯一 ID             | `1`, `42`, `100`                             |

#### 完整示例

```
# ERC721 NFT
SEPOLIA_0x1234567890123456789012345678901234567890_ERC721_42

# ERC1155 创作者权益
SEPOLIA_0xc7345ea65fd12cc3cad8f9991cfa46c13c0b1df8_ERC1155_1

# ERC3525 百老汇票房份额
SEPOLIA_0xccf9c481a2ddac0ad5a55c3a07c5cd04ca3d343e_ERC3525_1
```

### 旧格式（v1.0，向后兼容）

| 格式            | 说明             | 示例                                                 |
| --------------- | ---------------- | ---------------------------------------------------- |
| `CHAIN_ADDRESS` | 地址型（ERC20）  | `SEPOLIA_0x91daf662f2d8565c9fa73a43ca943ba78b0ff4b7` |
| `CUSTOM_CODE`   | 自定义代码       | `FOREST_CARBON_SEPOLIA_001`                          |
| `CHAIN_SYMBOL`  | 符号型（不推荐） | `SEPOLIA_FCC`                                        |

---

## 代币标准说明

### ERC721 (NFT)

- **特点**：非同质化代币，每个 tokenId 唯一
- **唯一标识**：`contractAddress + tokenId`
- **应用场景**：数字收藏品、艺术品、明星纪念品

### ERC1155 (多代币)

- **特点**：同一合约可管理多种代币类型
- **唯一标识**：`contractAddress + tokenId`
- **应用场景**：游戏道具、创作者权益、会员卡

### ERC3525 (半同质化)

- **特点**：支持同 slotId 内的代币合并/拆分
- **唯一标识**：`contractAddress + slotId`
- **应用场景**：票房份额、债券、可拆分权益

---

## 工具函数

### 生成唯一标识

```typescript
// TypeScript (@mobazha/core)
import { generateCryptoListingCurrencyCode } from '@mobazha/core/utils/tokenIdentifier';

const code = generateCryptoListingCurrencyCode(
  {
    contractAddress: '0xC7345EA65FD12cC3CaD8F9991cFA46C13c0B1DF8',
    tokenStandard: 'ERC1155',
    tokenId: '1',
  },
  'SEPOLIA'
);
// 输出: SEPOLIA_0xc7345ea65fd12cc3cad8f9991cfa46c13c0b1df8_ERC1155_1
```

```javascript
// JavaScript (mobazha-desktop / mobazha-mobile)
import { generateCryptoListingCurrencyCodeFromAsset } from './data/rwaAssetTemplates.js';

const code = generateCryptoListingCurrencyCodeFromAsset(asset, 'SEPOLIA');
```

### 解析唯一标识

```typescript
// TypeScript (@mobazha/core)
import { parseCryptoListingCurrencyCode } from '@mobazha/core/utils/tokenIdentifier';

const parsed = parseCryptoListingCurrencyCode(
  'SEPOLIA_0xc7345ea65fd12cc3cad8f9991cfa46c13c0b1df8_ERC1155_1'
);
// 输出:
// {
//   blockchain: 'sepolia',
//   tokenAddress: '0xc7345ea65fd12cc3cad8f9991cfa46c13c0b1df8',
//   tokenStandard: 'ERC1155',
//   tokenId: '1',
//   slotId: undefined
// }
```

```javascript
// JavaScript
import { parseCryptoListingCurrencyCode } from './data/rwaAssetTemplates.js';

const parsed = parseCryptoListingCurrencyCode(code);
```

### 查找预定义资产

```typescript
// TypeScript
import { findPredefinedAsset } from '@mobazha/core/data/rwaAssetTemplates';

const asset = findPredefinedAsset({
  tokenAddress: '0xc7345ea65fd12cc3cad8f9991cfa46c13c0b1df8',
  tokenStandard: 'ERC1155',
  tokenId: '1',
});
```

---

## 各客户端实现

### @mobazha/core (mobazha-unified)

| 文件                                      | 用途                  |
| ----------------------------------------- | --------------------- |
| `packages/core/utils/tokenIdentifier.ts`  | 代币标识生成/解析工具 |
| `packages/core/data/rwaAssetTemplates.ts` | 预定义资产模板        |
| `packages/core/types/rwa.ts`              | 类型定义              |

### mobazha-desktop

| 文件                                                     | 用途                     |
| -------------------------------------------------------- | ------------------------ |
| `frontend/src/data/rwaAssetTemplates.js`                 | 预定义资产模板和工具函数 |
| `frontend/src/data/rwaTokenMockData.js`                  | 旧版 Mock 数据（已废弃） |
| `frontend/src/views/modals/editListing/RwaTokenType.vue` | RWA Token 创建组件       |

### mobazha-mobile

| 文件                        | 用途                     |
| --------------------------- | ------------------------ |
| `data/rwaAssetTemplates.js` | 预定义资产模板和工具函数 |
| `config/rwaTokens.js`       | 代币配置（已支持新格式） |
| `services/tokenResolver.js` | 代币解析服务             |

---

## 预定义资产类型

| 类型代码   | 名称       | Token 标准 | 说明                   |
| ---------- | ---------- | ---------- | ---------------------- |
| `NFT`      | 收藏品 NFT | ERC721     | 数字艺术品、收藏卡等   |
| `CREATOR`  | 创作者权益 | ERC1155    | 游戏主播、博主社区权益 |
| `BROADWAY` | 百老汇票房 | ERC3525    | 演出票房收益份额       |
| `CUSTOM`   | 自定义资产 | -          | 手动输入合约参数       |

---

## 数据流示例

### 创建 Listing

```
用户选择预定义资产
    ↓
调用 generateCryptoListingCurrencyCodeFromAsset(asset, blockchain)
    ↓
生成 cryptoListingCurrencyCode
    ↓
保存到 item.cryptoListingCurrencyCode
    ↓
提交到后端
```

### 读取 Listing

```
从后端获取 item.cryptoListingCurrencyCode
    ↓
调用 parseCryptoListingCurrencyCode(code)
    ↓
获取 { blockchain, tokenAddress, tokenStandard, tokenId/slotId }
    ↓
调用 findPredefinedAsset(parsed) 查找完整信息
    ↓
显示资产详情
```

---

## 向后兼容

解析函数 `parseCryptoListingCurrencyCode` 支持以下格式的自动识别：

| 格式                | 识别方式           | 解析结果                          |
| ------------------- | ------------------ | --------------------------------- |
| `CHAIN_ADDR_STD_ID` | 4 段，含 ERC 标准  | 完整 TokenIdentifier              |
| `CHAIN_ADDR`        | 2 段，第二段是地址 | blockchain + tokenAddress + ERC20 |
| `CHAIN_SYMBOL`      | 2 段，第二段是符号 | blockchain（需查表补全地址）      |

---

## FAQ

### Q: 同一合约的不同 tokenId 是不同的商品吗？

A: 是的。对于 ERC721 和 ERC1155，每个 `contractAddress + tokenId` 组合代表一种独立的资产。

### Q: ERC3525 为什么用 slotId 而不是 tokenId？

A: ERC3525 的 slotId 代表资产类型（如某部音乐剧的票房份额），同一 slotId 内的 token 可以合并/拆分，tokenId 只是临时的持有标识。

### Q: 旧格式的 cryptoListingCurrencyCode 还能用吗？

A: 可以。解析函数会自动识别并尽可能解析旧格式。但建议新创建的 Listing 使用新格式。

### Q: 如何添加新的预定义资产？

A: 在 `rwaAssetTemplates.ts/js` 的 `predefinedAssets` 对象中添加新条目即可。

---

## 相关文档

- [mobazha-mobile: 代币标识与存储策略](../../mobazha-mobile/docs/TOKEN_IDENTIFICATION_AND_STORAGE.md)
- [mobazha-desktop: RWA Token 前端设计](../../mobazha-desktop/frontend/docs/RWA_TOKEN_FRONTEND_DESIGN.md)
- [mobazha-mobile: RWA Token 买家支付流程](../../mobazha-mobile/docs/RWA_TOKEN_BUYER_PAYMENT.md)

---

## 变更历史

| 日期       | 版本 | 变更内容                                       |
| ---------- | ---- | ---------------------------------------------- |
| 2026-01-14 | 1.0  | 初始版本，统一 ERC721/ERC1155/ERC3525 标识格式 |
