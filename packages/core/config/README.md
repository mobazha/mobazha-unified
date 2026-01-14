# 环境配置说明

## 环境变量

在 `apps/web` 目录下创建 `.env.local` 文件配置环境：

```bash
# 环境模式: test | production | local
NEXT_PUBLIC_ENV_MODE=test

# 是否使用 Mock 数据
NEXT_PUBLIC_USE_MOCK_DATA=false

# API 基础地址（可选，覆盖默认配置）
# NEXT_PUBLIC_API_URL=https://miniapptest.mobazha.org
```

## 预设环境

### 测试环境 (test)

- API: `https://miniapptest.mobazha.org`
- Casdoor: `https://test-login.mobazha.org`

### 生产环境 (production)

- API: `https://miniapp.mobazha.org`
- Casdoor: `https://login.mobazha.org`

### 本地开发 (local)

- API: `http://localhost:4002`
- Casdoor: 同测试环境

## 测试账号

| 角色      | 用户名            | 密码          |
| --------- | ----------------- | ------------- |
| Buyer     | `buyer`           | `buyer_demo`  |
| Seller    | `seller`          | `seller_demo` |
| Moderator | `fengzie_desktop` | `mod_demo`    |

## 运行测试

```bash
# 进入 core 包目录
cd packages/core

# 运行单元测试
pnpm test:unit

# 运行集成测试（需要网络）
pnpm test:integration

# 运行 E2E 流程测试
pnpm test:e2e

# 运行健康检查
pnpm test:health
```

## 代码中切换环境

```typescript
import { switchToTestEnv, switchToProdEnv, switchToLocalEnv } from '@mobazha/core';

// 切换到测试环境
switchToTestEnv();

// 切换到生产环境
switchToProdEnv();

// 切换到本地开发环境
switchToLocalEnv();
```
