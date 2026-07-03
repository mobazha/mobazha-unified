---
name: matrix-chat-guide
description:
  Matrix 聊天前端开发指南（REST + WS 薄客户端）。当需要开发聊天 UI、修改消息处理、调试 WS
  事件时使用。触发词："Matrix", "聊天", "消息", "加密聊天", "端到端加密", "房间", "chat",
  "mautrix"。
---

# Matrix 聊天前端开发指南

> 完整设计文档：`mobazha_hosting/docs/chat/MATRIX_CHAT_DESIGN.md`

## 架构

前端为纯 REST +
WebSocket 薄客户端，**不持有 matrix-js-sdk**。所有 Matrix 协议交互（包括 E2EE）由后端 mautrix-go 处理。

```
前端 ─REST─→ 后端 /v1/chat/* API
前端 ◄──WS── 后端 chat.* 事件推送
```

## 文件结构

```
packages/core/services/matrix/
├── client.ts           # MatrixClient facade（代理到 REST API）
├── messages.ts         # 消息 CRUD（send/edit/redact/paginate）
├── rooms.ts            # 房间 CRUD + BackendRoom → MatrixRoom 映射
├── event-listeners.ts  # WS chat.* 事件处理分发
├── verification.ts     # SAS 验证 REST API 调用
├── types.ts            # TypeScript 类型（BackendRoom/Message/Member）
└── index.ts            # 导出

packages/core/config/apiPaths.ts    # NODE_API.CHAT_* 路径常量
packages/core/stores/chatStore.ts   # Zustand 聊天状态
apps/web/src/components/ChatDrawer/ # 聊天 UI 组件
└── hooks/useChatEffects.ts         # WS 事件消费 + 验证事件监听
```

## REST API 调用模式

所有 Chat API 通过 `authFetch` + `NODE_API` 常量调用：

```typescript
import { authFetch } from '../helpers';
import { NODE_API } from '../../config/apiPaths';

// 发送消息
const response = await authFetch(`${NODE_API.CHAT_ROOMS}/${roomId}/messages`, {
  method: 'POST',
  body: JSON.stringify({ body: content }),
});

// 获取房间列表
const rooms = await authFetch(NODE_API.CHAT_ROOMS);
```

## WS 事件消费

后端通过 WebSocket 推送 `chat.*` 事件，前端在 `event-listeners.ts` 中处理：

| 事件                  | 处理                                 |
| --------------------- | ------------------------------------ |
| `chat.message`        | 追加到对应房间消息列表               |
| `chat.message_edit`   | 更新已有消息内容                     |
| `chat.message_redact` | 从列表中移除消息                     |
| `chat.typing`         | 更新打字指示器                       |
| `chat.read_receipt`   | 更新已读状态                         |
| `chat.room_invite`    | 根据 InvitePolicy 自动接受或弹出确认 |
| `chat.verification.*` | 触发验证 UI 流程                     |

## 数据类型映射

后端返回 → 前端类型转换在 `rooms.ts` 的 `convertRoom()`/`convertMember()` 中：

- `BackendRoom` → `MatrixRoom`
- `BackendMember.peerID` → `MatrixUser.peerID`（原始大小写，来自 state event）
- `BackendMessage.media` → 处理加密房间 `content.File.URL` 路径

## 修改指引

### 新增 Chat 功能的前端部分

1. 确认后端 API 已在 `mobazha/internal/api/routes.go` 注册
2. 在 `apiPaths.ts` 添加 `CHAT_*` 常量
3. 在 `services/matrix/` 对应模块添加 REST 调用
4. 如果是实时事件，在 `event-listeners.ts` 添加处理
5. 在 UI 组件中消费

### 调试

- REST API：浏览器 DevTools → Network 面板
- WS 事件：DevTools → Network → WS 连接 → Messages 面板
- 后端日志：grep `matrix` 在节点日志中（如启用 debug 模式）
- 聊天状态：React DevTools 查看 Zustand chatStore

### 注意事项

- 不要引入 `matrix-js-sdk`（已在迁移中移除）
- 所有加密操作在后端完成，前端不接触密钥
- 媒体使用 `Authorization` header 下载，不在 URL 中放 token
- PeerID 使用 `member.peerID` 字段（原始大小写），不要从 userId 正则提取
