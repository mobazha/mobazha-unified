# 多账号绑定与统一身份管理 (Account Binding)

## 功能 ID

`FEAT-AUTH-ACCOUNT-BINDING-001`

## 来源

- 设计文档: `/LOGIN_MANAGEMENT.md`
- 新增功能，无原 RN/Vue 对应

## 功能描述

允许用户将多个 OAuth 账号（Discord、Telegram、Google、GitHub、Apple、WeChat）绑定到同一个 Mobazha 身份。用户可以使用任意已绑定的账号登录，且始终对应同一个 Peer ID 和 Mobazha 节点。

### 核心原则

1. **一用户一身份**：多个 OAuth 账号 → 一个 Casdoor User → 一个 Peer ID
2. **多方式登录**：用户可通过任意已绑定账号登录
3. **统一认证**：使用 Casdoor 作为认证中心

## 用户故事

- 作为用户，我可以在设置中查看已绑定的账号列表
- 作为用户，我可以绑定新的 OAuth 账号以增加登录方式
- 作为用户，我可以解绑已绑定的 OAuth 账号（至少保留一种）
- 作为用户，我可以使用任意已绑定账号登录同一个 Mobazha 身份

## 接口依赖

### mobazha_hosting API

> **路径前缀**：所有 Hosting 平台 API 使用 `/platform/v1/` 前缀（Phase R1 完成迁移）。

| 端点                                  | 方法 | 描述                                                       |
| ------------------------------------- | ---- | ---------------------------------------------------------- |
| `/platform/v1/accounts/linked`        | GET  | 获取当前用户已绑定的账号列表                               |
| `/platform/v1/accounts/link-url`      | GET  | 生成 Casdoor link mode OAuth URL（state=link:uuid:type）   |
| `/platform/v1/accounts/link-callback` | GET  | 处理 Casdoor link mode 回调（provider_id + provider_type） |
| `/platform/v1/accounts/link/config`   | GET  | 获取可用 provider 配置（Telegram bot、Discord clientId）   |
| `/platform/v1/accounts/link/telegram` | GET  | Telegram 直接绑定（Login Widget HMAC 验证）                |
| `/platform/v1/accounts/unlink`        | POST | 解绑指定 OAuth Provider                                    |

### 响应格式

#### GET /platform/v1/accounts/linked

```json
{
  "data": {
    "accounts": [
      {
        "provider": "discord",
        "providerId": "123456789",
        "displayName": "",
        "avatar": "",
        "canUnlink": true
      }
    ],
    "totalCount": 1,
    "minRequired": 1,
    "hasPassword": true
  }
}
```

#### GET /platform/v1/accounts/link-callback?code=xxx&state=link:uuid:telegram

```json
{
  "data": { "success": true }
}
```

#### POST /platform/v1/accounts/unlink

```json
// Request
{ "provider": "telegram" }

// Response
{
  "data": { "success": true }
}
```

## 技术实现

### 前端文件

| 文件路径                                                    | 描述                          |
| ----------------------------------------------------------- | ----------------------------- |
| `packages/core/types/account.ts`                            | 类型定义                      |
| `packages/core/services/auth/accountBinding.ts`             | 账号绑定服务                  |
| `apps/web/src/app/settings/account/page.tsx`                | 账号设置页面                  |
| `apps/web/src/components/ProviderIcon/index.tsx`            | Provider 图标组件             |
| `apps/web/src/components/SettingsDrawer/SettingsDrawer.tsx` | 桌面端设置抽屉中的账号绑定 UI |

### 支持的 OAuth Provider

| Provider | ID         | 图标来源                              |
| -------- | ---------- | ------------------------------------- |
| Discord  | `discord`  | Simple Icons CDN                      |
| Telegram | `telegram` | Simple Icons CDN                      |
| Google   | `google`   | Simple Icons CDN                      |
| GitHub   | `github`   | Simple Icons CDN (浅灰色适配深色主题) |
| Apple    | `apple`    | Simple Icons CDN (浅灰色适配深色主题) |
| WeChat   | `wechat`   | Simple Icons CDN                      |

### 图标 CDN

使用 [Simple Icons](https://simpleicons.org/) 提供的 CDN：

```typescript
const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org';
// 示例: https://cdn.simpleicons.org/discord/5865F2
```

### 绑定架构

采用**双路径**架构，Telegram 特殊处理，其余走 Casdoor 通用 link mode：

| Provider                     | 路径              | 说明                                                                      |
| ---------------------------- | ----------------- | ------------------------------------------------------------------------- |
| Telegram                     | 直接验证          | Login Widget → HMAC-SHA256 验证 → Hosting Admin API 绑定                  |
| Discord / Google / GitHub 等 | Casdoor link mode | Casdoor OAuth（method=link）→ 返回 provider 身份 → Hosting Admin API 绑定 |

### 数据流：标准 OAuth Provider（Casdoor Link Mode）

```
用户点击绑定（Discord / Google / GitHub 等）
     │
     ▼
startLinkAccount(provider)
     │
     ├── 请求 GET /platform/v1/accounts/link-url?provider=discord
     │   （hosting 生成 Casdoor OAuth URL，state=link:<uuid>:<provider>）
     │
     ▼
跳转到 Casdoor OAuth（method=link，用户完成第三方认证）
     │
     ▼
Casdoor 后端检测 method=link → 不创建/登录用户
     │   返回 link_provider_info:<type>:<id>
     │
     ▼
Casdoor 前端（AuthCallback.js）带 provider_id + provider_type 重定向回前端
     │
     ▼
前端检测 URL 含 provider_id → 调用 handleLinkCallback()
     │
     ├── 请求 GET /platform/v1/accounts/link-callback?provider_id=xxx&provider_type=discord&state=link:...
     │   （hosting 后端：验证 state → Casdoor Admin API 绑定 provider ID 到当前用户）
     ├── 清除 URL 参数
     ├── 刷新已绑定账号列表
     │
     ▼
显示绑定成功
```

### 数据流：Telegram（直接验证）

```
用户点击 Telegram 绑定
     │
     ▼
Telegram Login Widget 弹出 → 用户授权
     │
     ▼
Widget 返回 auth_data（id, first_name, hash 等）
     │
     ▼
directLinkTelegram(authData)
     │
     ├── 请求 GET /platform/v1/accounts/link/telegram?id=xxx&hash=xxx&...
     │   （hosting 后端：HMAC-SHA256 验证 → Casdoor Admin API 绑定 telegram ID）
     ├── 刷新已绑定账号列表
     │
     ▼
显示绑定成功
```

## 验收标准 (Acceptance Criteria)

- [x] AC1: 已绑定账号列表正确显示
- [x] AC2: 可绑定 Provider 列表正确显示
- [x] AC3: 点击绑定按钮可发起 OAuth 流程
- [x] AC4: OAuth 回调后正确更新绑定状态
- [x] AC5: 解绑功能正常工作
- [x] AC6: 最后一个账号不可解绑（保留提示）
- [x] AC7: 响应式布局 - 移动端/桌面端正确显示
- [x] AC8: 加载状态正确显示 (Skeleton)
- [x] AC9: 错误状态正确处理 (Toast 提示)
- [x] AC10: 所有文本支持 i18n 国际化

## UI/UX 规格

### 移动端布局 (< 768px)

- 独立页面 `/settings/account`
- 顶部返回按钮
- 卡片式列表展示已绑定/可绑定账号
- 左侧图标 + 右侧操作按钮

### 桌面端布局 (>= 1024px)

- 集成在 Settings Drawer 中
- 侧边栏入口：Settings → Account Binding
- 内容区展示账号列表

### 交互细节

1. **绑定流程**
   - 点击绑定按钮 → 按钮显示 loading (`...`)
   - 跳转 OAuth 页面 → 返回后显示成功/失败 Toast

2. **解绑流程**
   - 点击解绑按钮 → 弹出确认对话框
   - 确认后执行解绑 → 显示成功/失败 Toast

3. **最后一个账号**
   - `canUnlink: false` 时隐藏解绑按钮

## i18n 翻译键

```typescript
settings.accountBinding: {
  title: '账号绑定',
  description: '绑定多个账号后，您可以使用任意一个登录',
  linked: '已绑定账号',
  available: '可绑定账号',
  noLinked: '暂无绑定账号',
  notLinked: '未绑定',
  link: '绑定',
  unlink: '解绑',
  unlinkConfirm: '确认解绑',
  unlinkConfirmDesc: '确定要解绑 {{provider}} 账号吗？解绑后将无法使用该账号登录。',
  linkSuccess: '账号绑定成功',
  linkFailed: '账号绑定失败',
  unlinkSuccess: '账号解绑成功',
  unlinkFailed: '账号解绑失败',
  keepOne: '保留登录方式',
  keepOneDesc: '绑定多个账号后，您可以使用任意一个登录。为确保账号安全，至少需要保留一种登录方式。'
}
```

## 迁移状态

- [x] Core types 完成
- [x] Core services 完成
- [x] UI 组件完成 (ProviderIcon)
- [x] 页面集成完成
- [x] i18n 翻译完成 (9 种语言)
- [ ] 单元测试
- [ ] E2E 测试
- [x] 迁移状态文档更新

## 相关文档

- [登录管理文档](/LOGIN_MANAGEMENT.md)
- [Casdoor 官方文档](https://casdoor.org/docs/overview)
- [Simple Icons](https://simpleicons.org/)

## 备注

### 后端实现说明

后端 API 已在 `mobazha_hosting/api/account_handlers.go` 中实现：

1. **获取已绑定账号** (`/platform/v1/accounts/linked`)
   - 从 Casdoor 获取用户信息（`casdoorsdk.GetUser`）
   - 遍历 `discord`, `telegram`, `google`, `github`, `apple`, `wechat` 字段
   - 返回非空字段作为已绑定账号

2. **获取 Provider 配置** (`/platform/v1/accounts/link/config`)
   - 返回可用 provider 配置（Telegram bot username、Discord client ID 等）
   - 前端据此渲染绑定按钮（如 Telegram Login Widget 需要 bot username）

3. **生成 Casdoor Link URL** (`/platform/v1/accounts/link-url`)
   - 构造 Casdoor OAuth URL，state 格式为 `link:<uuid>:<provider>`
   - Casdoor 检测 `link:` state → 设置 `method=link` → 不创建/登录用户
   - Casdoor 返回 `link_provider_info:<type>:<id>`，前端 AuthCallback.js 解析后重定向回来

4. **处理 Casdoor Link 回调** (`/platform/v1/accounts/link-callback`)
   - 接收 `provider_id` + `provider_type` + `state`（来自 Casdoor link mode 重定向）
   - 验证 state 中的 UUID 与当前 JWT 用户一致
   - 冲突检测：检查该 provider ID 是否已被其他用户绑定
   - 通过 `casdoorsdk.UpdateUserForColumns()` 将 provider ID 写入当前用户

5. **Telegram 直接绑定** (`/platform/v1/accounts/link/telegram`)
   - 接收 Telegram Login Widget auth_data 参数
   - HMAC-SHA256 验证签名（使用 Bot Token）
   - 验证数据时效性（5 分钟内）
   - 通过 Casdoor Admin API 绑定 telegram ID 到当前用户

6. **解绑账号** (`/platform/v1/accounts/unlink`)
   - 计算总登录方式 = OAuth 绑定数 + 是否有密码（`user.Password != ""`）
   - 总登录方式 <= 1 时拒绝解绑（必须保留至少一种登录方式）
   - 通过 Casdoor Admin API 清除用户的 provider 字段

### Casdoor 改动

Casdoor 新增了通用 **link mode** 支持（`controllers/auth.go` + `web/src/auth/AuthCallback.js`）：

- 后端：`authForm.Method == "link"` 时，只提取 provider 身份信息，返回 `link_provider_info:<type>:<id>`，不执行用户创建或登录
- 前端：AuthCallback.js 检测 `link:` state → 设置 method=link → 解析响应 → 带 provider_id/provider_type 重定向回调用方

### 已知限制

- 每个 OAuth ID 只能绑定到一个 Mobazha 账户
- 绑定冲突时会提示错误
- GitHub 和 Apple 图标在深色主题下使用浅灰色 (#B0B0B0)
