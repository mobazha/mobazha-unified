---
name: matrix-chat-guide
description: Guide for Matrix chat integration in Mobazha including SDK initialization, E2E encryption, room management, message handling, and reconnection strategies. Use when working with chat features, Matrix SDK, or messaging, "Matrix", "聊天", "消息", "加密聊天", "端到端加密", "房间".
---

# Matrix 聊天开发指南

Mobazha 项目的 Matrix 协议集成规范。

## 架构概览

```
packages/core/services/matrix/
├── client.ts    # MatrixService 主服务 (~2500行)
├── crypto.ts    # E2E 加密模块
├── events.ts    # 事件发射器
├── storage.ts   # 凭证存储适配器
└── types.ts     # 类型定义

packages/core/hooks/
├── useMatrixInit.ts   # 初始化 + 自动重连
├── useMatrixChat.ts   # 消息收发 + UI 状态
└── useMatrix.ts       # 高层抽象（房间管理）
```

## 初始化流程

### 自动初始化（推荐）

通过 `useMatrixInit` hook，用户登录后自动初始化：

```typescript
// 在 App 根组件中使用
function App() {
  useMatrixInit();  // 自动处理初始化、重连、token 刷新
  return <AppContent />;
}
```

### 初始化顺序

```
用户登录
  → initializeWithPeerID(peerID)
    → 获取服务器配置
    → 检查 localStorage 中的 token
    → 验证 token / 自动注册
    → 检查 crypto store 设备匹配
    → 创建 MatrixClient
    → 初始化 Rust Crypto (E2EE)
    → 设置事件监听
  → startSync()
    → 等待 PREPARED 状态 (60s 超时)
    → E2EE 后置设置
    → 连接完成
```

### 重连机制

`useMatrixInit` 已内置：

- 最大重试 3 次，间隔 5 秒
- 断线自动重连
- Token 过期自动刷新（`AUTH_REQUIRED` 事件）

## 房间管理

### 房间类型

项目中有三种特殊房间类型（通过 `useMatrix` hook）：

```typescript
const { createOrderRoom, createStoreRoom, createGroupRoom } = useMatrix();

// 订单相关聊天（买卖双方 + 仲裁员）
await createOrderRoom(orderId, participants);

// 店铺相关聊天
await createStoreRoom(storeId);

// 群组聊天
await createGroupRoom(groupName, members);
```

### 房间筛选

```typescript
// useMatrix 提供按类型筛选的房间列表
const { rooms, orderRooms, storeRooms } = useMatrix();
```

## 消息处理

### 发送消息（乐观更新模式）

项目使用乐观更新确保 UI 响应性：

```typescript
// useMatrixChat 内部实现的模式：
const localId = `local_${Date.now()}`;

// 1. 立即在 UI 显示（乐观更新）
addMessage(roomId, {
  id: localId,
  content: text,
  status: 'SENDING',
});

try {
  // 2. 实际发送
  const result = await matrixService.sendMessage(roomId, text);

  // 3. 更新为成功
  updateMessage(roomId, localId, {
    id: result.eventId,
    status: 'SENT',
  });
} catch {
  // 4. 标记失败
  updateMessage(roomId, localId, { status: 'FAILED' });
}
```

### 使用 useMatrixChat

```typescript
const {
  messages, // 当前房间消息列表
  sendMessage, // 发送文本消息
  isLoading, // 加载状态
  hasMore, // 是否有更多历史消息
  loadMore, // 加载更多
} = useMatrixChat(roomId);
```

## 端到端加密 (E2EE)

### 关键概念

- 使用 **Rust Crypto**（`matrix-js-sdk` 的 WASM 实现）
- 加密数据存储在 **IndexedDB** 中
- 支持 **cross-signing** 和 **密钥备份**

### 加密初始化

```typescript
// 在 client.ts 中自动处理
await matrixClient.initRustCrypto({
  useIndexedDB: true,
  cryptoDatabasePrefix: `matrix-crypto-${userId}`,
});
```

### 错误恢复

当加密数据损坏时（WASM panic），系统会自动：

1. 清除损坏的 IndexedDB 数据
2. 重新初始化加密
3. 从备份恢复密钥

### 密钥备份策略

- 密钥 bundle 自动备份到 Mobazha 节点
- 每 5 分钟自动备份，30 秒去抖
- 登录新设备时自动恢复

## 事件系统

### 关键事件

```typescript
// packages/core/services/matrix/events.ts
enum MatrixEvent {
  CONNECTED, // 连接成功
  DISCONNECTED, // 断线
  SYNC_ERROR, // 同步错误
  AUTH_REQUIRED, // 需要重新认证
  MESSAGE_RECEIVED, // 收到新消息
  ROOM_INVITE, // 收到房间邀请
  // ...12+ 事件
}
```

### 事件订阅模式

```typescript
// useMatrixInit 中的事件订阅模式
useEffect(() => {
  const unsubscribers = [
    events.on(MatrixEvent.CONNECTED, handleConnected),
    events.on(MatrixEvent.DISCONNECTED, handleDisconnected),
    events.on(MatrixEvent.AUTH_REQUIRED, handleAuthRequired),
  ];

  return () => unsubscribers.forEach(unsub => unsub());
}, []);
```

## 开发注意事项

### 1. 初始化防重入

```typescript
// MatrixService 使用 Promise 防重入
if (this.initializationPromise) return this.initializationPromise;
this.initializationPromise = this._doInitialize();
try {
  return await this.initializationPromise;
} finally {
  this.initializationPromise = null;
}
```

### 2. 存储适配

`MatrixStorage` 接口支持多平台：

- Web: localStorage
- React Native: AsyncStorage（预留）

### 3. 凭证管理

- Access token 存储在 localStorage（MatrixStorage 适配器）
- Token 过期时通过 `AUTH_REQUIRED` 事件触发刷新
- 设备 ID 在登出后保留（避免重复设备注册）

### 4. 性能考虑

- 同步操作是长连接，注意内存管理
- 大量消息时使用分页加载（`loadMore`）
- 组件卸载时必须清理事件监听

## 常见问题排查

| 问题         | 可能原因             | 解决方案                         |
| ------------ | -------------------- | -------------------------------- |
| 连接超时     | 服务器配置错误       | 检查 `_getServerConfig()`        |
| 消息解密失败 | 加密数据损坏         | 清除 IndexedDB 重新初始化        |
| 同步卡住     | Token 过期           | 检查 `AUTH_REQUIRED` 事件处理    |
| 设备不信任   | Cross-signing 未完成 | 重新执行 cross-signing bootstrap |

## 快速检查清单

- [ ] 是否通过 `useMatrixChat` hook 收发消息（而非直接调用 service）？
- [ ] 事件监听是否在 cleanup 中取消订阅？
- [ ] 新房间类型是否通过 `useMatrix` 创建？
- [ ] 是否处理了消息发送失败的情况？
- [ ] 加密相关操作是否有 try/catch 和降级方案？
