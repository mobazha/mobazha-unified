# 聊天模块重构计划

## v1.1 — 前端代码拆分（已完成 ✅）

把 3 个过大文件拆到合理粒度（每个 < 800 行）。Phase 1-3 全部完成。

## v1.2 — Matrix 后端迁移（进行中）

### 目标

将 Matrix 客户端（含 E2EE）从浏览器迁移到后端节点，前端变为纯薄客户端。

### 动机

- 浏览器清缓存/换设备导致 E2EE 密钥丢失
- IndexedDB crypto state 脆弱，用户体验差
- 节点已持有 libp2p 私钥，可安全派生 Matrix 密钥
- 统一 API 为未来多平台（Mobile/Desktop/Extension）奠定基础

### 架构

```
Frontend (Browser)           Backend (MobazhaNode)           Synapse
┌──────────────────┐        ┌─────────────────────┐        ┌──────────┐
│  REST API calls  │──HTTP──│  MatrixChatService   │──CS──→│          │
│  WebSocket listen│◄──WS───│  (mautrix-go client) │◄─Sync─│  Matrix  │
│                  │        │  CryptoHelper (E2EE) │       │  Server  │
│  无 matrix-js-sdk│        │  PostgreSQL/SQLite   │       │          │
└──────────────────┘        └─────────────────────┘        └──────────┘
```

- **前端**：REST 调用 + WebSocket 接收实时事件，零 Matrix 协议代码
- **后端**：mautrix-go 负责 sync、E2EE、session 管理，状态持久化到数据库
- **SaaS**：初期每租户 lazy-load 独立 mautrix-go 实例；远期可迁移到 Appservice 模式

### 技术选型

- **SDK**：`mautrix-go` v0.26+（Matrix 官方 Stable，纯 Go/goolm 无 CGO，Beeper/Element 生产验证）
- **E2EE**：`crypto/cryptohelper.CryptoHelper`（封装 Olm/Megolm session + key backup + cross-signing）
- **存储**：复用现有 PostgreSQL/SQLite 双方言，crypto state 同库存储

---

## v1.1 详细记录（已完成，折叠保留）

<details>
<summary>Phase 1-3 前端拆分详情</summary>

### 重构范围

| 文件                                                | 当前行数 | 目标                          |
| --------------------------------------------------- | -------- | ----------------------------- |
| `packages/core/services/matrix/client.ts`           | 3574     | → 5 个文件，每个 500-800 行   |
| `apps/web/src/components/Chat/ChatMessages.tsx`     | 1561     | → 3-4 个文件，每个 300-600 行 |
| `apps/web/src/components/ChatDrawer/ChatDrawer.tsx` | 1367     | → 3 个文件，每个 300-500 行   |

Phase 1-3 全部完成，含 Bug 修复（自我 DM、Bot 房间分类、MatrixBotService 内网 URL、formatRoom 逻辑）。

</details>

---

## v1.2 实施计划

### Sprint 0：后端 mautrix-go 核心集成（mobazha3.0）

**0.1 — 添加 mautrix-go 依赖**

- `go get maunium.net/go/mautrix@v0.26`
- 验证 go.mod 兼容性，确认无依赖冲突
- 确认 goolm 纯 Go 构建无 CGO（`CGO_ENABLED=0 go build`）

**0.2 — 定义 MatrixChatService 接口**

- 文件：`pkg/contracts/matrix_chat_service.go`
- 方法分组：生命周期（Init/Close）、房间（List/Create/Join/Leave）、消息（Send/Get/Edit/Redact/React）、媒体（Upload/Download）、状态（Typing/Read/Presence）
- 事件回调：`OnMessage`, `OnRoomUpdate`, `OnTyping`, `OnPresence`
- 保留现有 `MatrixService` 接口不变（后续 Sprint 3 合并废弃）

**0.3 — 实现 mautrixChatService**

- 文件：`internal/core/mautrix_chat_service.go`
- mautrix.Client 初始化 + 密码登录（复用现有 HKDF 派生）
- CryptoHelper 集成（pickleKey 从 libp2p 私钥派生，DB 存储）
- Sync 循环（`client.SyncWithContext`），事件分发到回调
- 基本消息收发 + E2EE 加解密
- 媒体上传/下载使用 **streaming**（`io.Reader` 管道，不全量缓冲）

**0.4 — 接入 MobazhaNode**

- `internal/core/options.go` 添加 `WithMatrixChatService` option
- `internal/core/node.go` 添加 `matrixChatService` 字段和 accessor
- 节点启动时 lazy init（有 Matrix 配置才初始化）
- SaaS 模式：hosting 注入 Matrix 配置后触发初始化

### Sprint 1：后端 REST API + WebSocket 推送

**1.1 — Chat REST API（~20 端点）**

- 文件：`internal/api/chat_handlers.go`
- 路由前缀：`/v1/chat/`

| 端点                                                   | 方法        | 说明                                              |
| ------------------------------------------------------ | ----------- | ------------------------------------------------- |
| `/v1/chat/rooms`                                       | GET         | 房间列表                                          |
| `/v1/chat/rooms`                                       | POST        | 创建房间                                          |
| `/v1/chat/rooms/{roomID}/join`                         | POST        | 加入                                              |
| `/v1/chat/rooms/{roomID}/leave`                        | POST        | 离开                                              |
| `/v1/chat/rooms/{roomID}/messages`                     | GET         | 消息列表（分页，支持 `since` 参数做 gap filling） |
| `/v1/chat/rooms/{roomID}/messages`                     | POST        | 发送消息                                          |
| `/v1/chat/rooms/{roomID}/messages/{eventID}`           | PUT         | 编辑                                              |
| `/v1/chat/rooms/{roomID}/messages/{eventID}`           | DELETE      | 撤回                                              |
| `/v1/chat/rooms/{roomID}/messages/{eventID}/reactions` | POST        | 添加反应                                          |
| `/v1/chat/rooms/{roomID}/typing`                       | POST        | 正在输入                                          |
| `/v1/chat/rooms/{roomID}/read`                         | POST        | 标记已读                                          |
| `/v1/chat/rooms/{roomID}/members`                      | GET         | 成员列表                                          |
| `/v1/chat/rooms/{roomID}/invite`                       | POST        | 邀请                                              |
| `/v1/chat/rooms/{roomID}/kick`                         | POST        | 踢出                                              |
| `/v1/chat/rooms/{roomID}/settings`                     | GET/PUT     | 房间设置                                          |
| `/v1/chat/media/upload`                                | POST        | 上传文件（streaming）                             |
| `/v1/chat/media/{serverName}/{mediaID}`                | GET         | 下载/代理文件（streaming + 小文件 LRU 缓存）      |
| `/v1/chat/users/{userID}/block`                        | POST/DELETE | 屏蔽/取消                                         |
| `/v1/chat/presence`                                    | GET         | 在线状态                                          |

**关键设计点**：

- 消息发送 REST 返回含 `eventID`，前端用于去重
- `GET /messages` 支持 `?since={lastEventID}&limit=50` 做断线补漏
- 媒体上传响应包含 `mxcUri`，前端只需存这个 URI
- 媒体下载走 Node 代理并设置 `Cache-Control` header（浏览器缓存）

**1.2 — WebSocket 聊天事件推送**

- 扩展现有 `/ws` 协议，新增事件类型：

| 事件类型           | 载荷                                            |
| ------------------ | ----------------------------------------------- |
| `chat.message`     | `{roomID, eventID, sender, content, timestamp}` |
| `chat.edit`        | `{roomID, eventID, newContent}`                 |
| `chat.redact`      | `{roomID, eventID}`                             |
| `chat.reaction`    | `{roomID, eventID, targetEventID, key}`         |
| `chat.typing`      | `{roomID, userIDs}`                             |
| `chat.read`        | `{roomID, userID, eventID}`                     |
| `chat.room_update` | `{roomID, name, lastMessage, unreadCount}`      |
| `chat.presence`    | `{userID, presence, lastActive}`                |
| `chat.invite`      | `{roomID, inviter, roomName}`                   |

- 多 Tab/Session：WS hub 广播到同一用户所有连接
- 前端通过 `eventID` 去重（REST 响应 vs WS 推送可能重叠）

**1.3 — SaaS 代理**

- hosting `gateway.go` 转发 `/v1/chat/*` 到对应租户节点
- 复用现有 `getNodeService(r)` 路由机制

### Sprint 2：前端迁移

**2.1 — 重写 client.ts facade**

- 移除 `matrix-js-sdk` 依赖
- `MatrixClientService` 内部改为 REST + WS
- 保持所有公共方法签名不变
- 初始化：`GET /v1/chat/rooms` 替代 `client.startClient()`
- WS 连接：复用现有 `websocket/index.ts`，添加 `chat.*` 事件处理
- 断线重连后自动 gap filling（`GET /messages?since={lastEventID}`）

**2.2 — 重写 messages.ts + rooms.ts**

- SDK 调用 → REST 调用（`authFetch`）
- `formatRoom`/`formatMessage` 保留，输入从 SDK 对象变为 REST JSON

**2.3 — 重写 event-listeners.ts**

- SDK 事件 → WS 事件映射
- 保持对外 emit 的事件名不变（UI 组件无需改动）

**2.4 — 删除 crypto.ts / verification.ts / matrix-js-sdk 依赖**

- 前端不再处理 E2EE（后端透明处理）
- 删除 `matrix-js-sdk`、`matrix-sdk-crypto-wasm` 依赖
- 删除 Vite WASM 配置
- 删除 settings 中的"聊天加密"页面

### Sprint 3：清理与优化

**3.1 — 后端清理旧 Matrix API**

- 废弃 `/v1/matrix/key-backup/*`、`/v1/matrix/secrets-bundle/*` 等端点
- 合并 `MatrixService` 到 `MatrixChatService`（旧接口标记 deprecated）

**3.2 — 前端 Vite 清理**

- 移除 WASM MIME monkey-patch
- 移除 `/_matrix/` 代理配置

**3.3 — SaaS 优化**

- Lazy init：首次访问聊天时才启动 mautrix-go 客户端
- Idle timeout：长时间无活动的客户端停止 sync（保留 crypto state）
- 远期：评估 Appservice 模式替代独立客户端实例

**3.4 — 集成测试**

- 清缓存后聊天不丢数据
- 换浏览器后消息完整
- 多租户消息隔离
- 独立站 E2EE 端到端验证
- 大文件上传/下载 streaming 验证

### 关键设计约束

1. **Streaming 媒体**：上传/下载通过 `io.Reader` 管道，Node 内存 O(bufferSize)
2. **消息去重**：前端维护 `Set<eventID>`，REST 和 WS 可能返回同一事件
3. **Gap Filling**：前端记录最后 `eventID`，WS 重连后请求 `?since=`
4. **上传进度**：前端 `XMLHttpRequest.upload.onprogress`
5. **Sync 持久化**：CryptoHelper 自动管理 `next_batch` token
6. **E2EE 透明**：后端根据房间状态自动加解密，前端始终收到明文
7. **Node 依赖**：聊天功能依赖 Node 可用（与钱包、商品等一致）
