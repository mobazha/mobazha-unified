---
name: browser-extension-dev
description: >-
  Chrome/Brave 浏览器扩展开发执行器。覆盖 Ext-0 原型验证到 Ext-4 生态增强的全生命周期。
  Manifest V3 + Vite 多入口构建 + packages/core 100% 复用。
  触发词："浏览器扩展", "browser extension", "Chrome 扩展", "Ext-0",
  "扩展原型", "继续扩展开发", "extension dev", "Popup 开发", "Side Panel"。
---

# 浏览器扩展开发执行器

## 1. 快速上下文

阅读以下文件获取完整上下文：

```
mobazha_hosting/docs/extension/BROWSER_EXTENSION_DESIGN.md  # 深度设计文档
mobazha_hosting/docs/PRODUCT_ARCHITECTURE_DESIGN.md §4.7    # 产品战略定位
mobazha_hosting/docs/product/IMPLEMENTATION_ROADMAP.md §6.3 # 实施计划
```

## 2. 架构要点

```
apps/extension/                    # Chrome Manifest V3 扩展
├── manifest.json                  # MV3 声明（permissions, service_worker, popup, side_panel）
├── vite.config.ts                 # 多入口构建（popup + sidepanel + background）
├── src/
│   ├── popup/                     # Popup 视图（React 19, 400×600 上限）
│   ├── sidepanel/                 # Side Panel 视图（Chrome 114+）
│   ├── background/                # Service Worker（无 DOM，事件驱动）
│   ├── content/                   # Content Script（Ext-3+，isolated world）
│   └── shared/                    # 扩展内共享代码（storage adapter 等）
└── public/icons/                  # 扩展图标 16/48/128

packages/core/                     # 100% 复用：API、stores、hooks、utils
packages/ui/                       # 复用 UI 组件（需适配窄宽度）
```

## 3. 执行协议

当用户说"继续扩展开发"、"Ext-0"、"扩展下一步"时：

### Step 1: 定位当前进度

```bash
bash -c 'ls -la ~/dev/openbazaar/mobazha-unified/apps/extension/ 2>/dev/null || echo "未创建"'
```

### Step 2: 确认所在阶段

| 阶段         | 判断条件                  | 目标       |
| ------------ | ------------------------- | ---------- |
| Ext-0 未开始 | `apps/extension/` 不存在  | 创建脚手架 |
| Ext-0 进行中 | 有 manifest.json 但未验证 | 完成原型   |
| Ext-0 已完成 | 6 项成功标准全通过        | 进入 Ext-1 |
| Ext-1+       | Side Panel 完整购物流程   | 见设计文档 |

### Step 3: 按阶段执行

## 4. Ext-0 原型验证（~2 天）

### 4.1 脚手架搭建

```bash
cd ~/dev/openbazaar/mobazha-unified
mkdir -p apps/extension/src/{popup,sidepanel,background,shared} apps/extension/public/icons
```

关键文件：

- `apps/extension/package.json` — 依赖 `@mobazha/core`, `@mobazha/ui`, `react`, `vite`
- `apps/extension/manifest.json` — MV3 声明
- `apps/extension/vite.config.ts` — 多入口构建
- `apps/extension/tsconfig.json` — TypeScript 配置

### 4.2 核心适配（Ext-0 最小方案）

**Token 存储**：Popup/Side Panel 有自己的 `localStorage`，`@mobazha/core` 的 `getStoredToken()`/`saveToken()` 直接可用。Ext-1+ 再迁移到 `chrome.storage.session`。

**API URL**：扩展不经过 Vite proxy，需要配置完整 URL：

```typescript
// apps/extension/src/shared/init.ts
import { setApiConfig } from '@mobazha/core/services/api/config';
import { switchToTestEnv } from '@mobazha/core/config/env';

export function initExtension() {
  switchToTestEnv();
  setApiConfig({
    gatewayUrl: 'https://test-new.mobazha.org/v1',
    searchUrl: 'https://test-new.mobazha.org/info',
    mbzGatewayUrl: 'https://test-new.mobazha.org/info/v1',
  });
}
```

**CORS**：`manifest.json` 中声明 `host_permissions` 允许跨域请求：

```json
"host_permissions": ["https://test-new.mobazha.org/*"]
```

### 4.3 OAuth 登录

```typescript
// chrome.identity.launchWebAuthFlow
const redirectUrl = chrome.identity.getRedirectURL();
// → https://<extension-id>.chromiumapp.org/

// 前置条件：Casdoor 中注册此 redirect URI
```

**注意**：Ext-0 可先跳过 OAuth，使用 Basic Auth 或手动输入 token 验证 API 调用。OAuth 集成是高优先但非阻塞。

### 4.4 成功标准

- [ ] Chrome 开发者模式加载扩展，图标显示在工具栏
- [ ] 点击图标弹出 Popup，渲染 React 组件
- [ ] OAuth 登录流程完成（或 Basic Auth 替代）
- [ ] 登录后搜索商品，展示结果列表
- [ ] Side Panel 可打开并显示占位页面
- [ ] 构建产物无 CSP 违规

## 5. 本地开发工作流

```bash
# 启动开发服务器
cd apps/extension && pnpm dev

# Chrome 加载：
# 1. chrome://extensions → 开发者模式
# 2. "加载已解压的扩展" → 选择 apps/extension/dist
# 3. 工具栏出现 Mobazha 图标

# 调试入口：
# - Popup: 右键 Popup → "检查"
# - Side Panel: 右键 Side Panel → "检查"
# - Service Worker: chrome://extensions → 扩展卡片 → "Service Worker" 链接
```

**HMR**：`@crxjs/vite-plugin` 支持 Popup/Side Panel 热更新。Service Worker 变更自动重载。`manifest.json` 变更需手动刷新扩展。

## 6. 关键约束速查

| 约束                      | 影响                         | 应对                                          |
| ------------------------- | ---------------------------- | --------------------------------------------- |
| **禁止 `eval()`**         | CSP 阻止动态代码执行         | 确保 `packages/core` 无 `eval`/`new Function` |
| **Service Worker 无 DOM** | 不能引用 `window`/`document` | background 代码中条件判断                     |
| **30s 空闲挂起**          | Service Worker 不持久        | 事件驱动 + `chrome.alarms`                    |
| **Popup 400×600**         | 固定最大尺寸                 | 紧凑 UI 设计                                  |
| **Side Panel 宽度可变**   | 用户可拖动调整               | 响应式布局                                    |
| **`localStorage` 隔离**   | 扩展有独立存储空间           | Ext-0 直接使用，Ext-1+ 迁移                   |

## 7. 目录约定

| 文件                               | 职责                                           |
| ---------------------------------- | ---------------------------------------------- |
| `src/popup/App.tsx`                | Popup 根组件（搜索 + 快捷操作）                |
| `src/popup/main.tsx`               | Popup React 入口                               |
| `src/sidepanel/App.tsx`            | Side Panel 根组件（完整购物）                  |
| `src/sidepanel/main.tsx`           | Side Panel React 入口                          |
| `src/background/service-worker.ts` | Service Worker（OAuth token 交换、badge 更新） |
| `src/shared/init.ts`               | 扩展初始化（API URL 配置）                     |
| `src/shared/chrome-storage.ts`     | Chrome Storage 封装（Ext-1+）                  |

## 8. 阶段路线图

| Phase     | 范围                                                | 依赖             |
| --------- | --------------------------------------------------- | ---------------- |
| **Ext-0** | 脚手架 + Popup 登录 + 搜索                          | 无（可立即启动） |
| **Ext-1** | Side Panel 完整购物 + `chrome.storage.session` 迁移 | Ext-0 ✅         |
| **Ext-2** | 桌面通知 + Badge + 钱包概览                         | Ext-1            |
| **Ext-3** | Content Script 跨站增强                             | Ext-2            |
| **Ext-4** | 生态增强（推荐、同步）                              | Ext-3            |

## 9. 常见问题

| 问题                | 原因                       | 解决                                     |
| ------------------- | -------------------------- | ---------------------------------------- |
| Popup 白屏          | CSP 阻止内联脚本           | 检查 Vite 构建无内联 `<script>`          |
| Service Worker 报错 | 引用了 `window`/`document` | 拆分浏览器代码和 SW 代码                 |
| API 返回 CORS 错误  | 缺少 `host_permissions`    | manifest 添加 API 域名                   |
| HMR 不生效          | 插件版本不匹配             | 检查 `@crxjs/vite-plugin` 兼容 Vite 版本 |
| OAuth redirect 失败 | Casdoor 未注册 URI         | 添加 `https://<id>.chromiumapp.org/`     |
