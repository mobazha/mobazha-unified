# 聊天模块重构计划

## 目标

把 3 个过大文件拆到合理粒度（每个 < 800 行），让 AI 能一次性读完理解。不追求极致细分。

## 重构范围

| 文件                                                | 当前行数 | 目标                          |
| --------------------------------------------------- | -------- | ----------------------------- |
| `packages/core/services/matrix/client.ts`           | 3574     | → 5 个文件，每个 500-800 行   |
| `apps/web/src/components/Chat/ChatMessages.tsx`     | 1561     | → 3-4 个文件，每个 300-600 行 |
| `apps/web/src/components/ChatDrawer/ChatDrawer.tsx` | 1367     | → 3 个文件，每个 300-500 行   |

辅助文件（不需要重构）：

| 文件                                                        | 行数 | 职责                  |
| ----------------------------------------------------------- | ---- | --------------------- |
| `packages/core/services/matrix/crypto.ts`                   | 1035 | E2EE 密钥备份/恢复    |
| `packages/core/services/matrix/types.ts`                    | 325  | 类型定义 + 事件名常量 |
| `packages/core/services/matrix/storage.ts`                  | 178  | 凭证存储              |
| `packages/core/services/matrix/events.ts`                   | 79   | EventEmitter 单例     |
| `apps/web/src/components/Chat/ChatList.tsx`                 | 589  | 房间列表              |
| `apps/web/src/components/Chat/UserInfoCard.tsx`             | 345  | 用户信息卡            |
| `apps/web/src/components/ChatDrawer/VerificationDialog.tsx` | 193  | 验证对话框            |
| `apps/web/src/components/ChatDrawer/NewChatDialog.tsx`      | 239  | 新建聊天              |

---

## Phase 1: `client.ts` 拆分（3574 → 5 个文件）

### 目标结构

```
packages/core/services/matrix/
├── client.ts           ← Facade + 初始化 + 同步 + 生命周期（~800行）
├── rooms.ts            ← 房间 CRUD + 格式化 + 成员 + 邀请策略（~800行）
├── messages.ts         ← 消息发送/加载/格式化 + 媒体上传 + 编辑/反应（~900行）
├── verification.ts     ← SAS 验证 + 屏蔽/忽略（~400行）
├── event-listeners.ts  ← setupEventListeners 大函数（~400行）
├── crypto.ts           ← 不动
├── types.ts            ← 不动
├── storage.ts          ← 不动
├── events.ts           ← 不动
├── index.ts            ← 更新导出
```

### 设计要点

- `client.ts` 保留 `MatrixClientService` class 作为 Facade，持有 SDK client 实例和核心状态
- 其他模块导出**纯函数**，第一个参数接收 context 对象
- 外部调用 `matrixClient.sendMessage()` 签名不变——Facade 方法体一行委派

```typescript
// client.ts (Facade 示例)
import { sendMessage } from './messages';

class MatrixClientService {
  async sendMessage(roomId: string, content: string) {
    return sendMessage(this.getContext(), roomId, content);
  }

  private getContext(): MatrixContext {
    return {
      client: this.client!,
      config: this.config!,
      isConnected: this.isConnected,
      currentPeerID: this.currentPeerID,
      processedMessageIds: this.processedMessageIds,
      _peerIdCache: this._peerIdCache,
    };
  }
}
```

### 各模块方法归属

**client.ts（Facade + 初始化 + 同步 + 生命周期）**：

- `initializeWithPeerID`, `_doInitializeWithPeerID`, `_getServerConfig`, `_autoRegister`, `_registerNewUser`, `_syncPasswordAndLogin`, `_loginWithPassword`, `_createTokenRefreshFunction`, `_getOrCreateDeviceId`, `_generateRandomString`, `_validateAccessToken`, `initialize`, `login`, `logout`
- `startSync`, `stopSync`, `_setupE2EEAfterSync`
- `_scheduleKeyBackup`, `_startAutoBackup`, `_stopAutoBackup`
- `isClientConnected`, `getUserId`, `getDeviceId`
- `syncProfileToMatrix`, `setDisplayName`
- crypto store 清理方法（`_ensureCryptoStoreMatchesDevice` 等）
- 需要动态 `import('matrix-js-sdk')`：4 处（init/login）+ 1 处（startSync）

**rooms.ts（房间 CRUD + 格式化 + 成员 + 邀请策略）**：

- `getRooms`, `getOrCreateDirectRoom`, `createDirectRoom`, `_updateDirectRoomMapping`, `findDirectRoom`
- `joinRoom`, `leaveRoom`, `inviteToRoom`, `kickFromRoom`, `setRoomName`, `setRoomTopic`
- `createOrderRoom`, `getOrderRoom`, `createStoreRoom`, `getStoreRoom`, `createModeratorRoom`, `createGroupRoom`
- `getRoomsByType`
- `setInvitePolicy`, `getInvitePolicy`, `_loadInvitePolicy`, `isMobazhaUser`, `_handleRoomInvite`
- `formatRoom`, `getRoomMembers`, `isDirectRoom`, `isRoomEncrypted`, `getRoomUnreadCount`
- `getMemberPeerID`, `extractPeerIdFromUserId`, `setMyPeerIDInRoom`
- 需要动态 `import('matrix-js-sdk')`：5 处（createRoom 系列）

**messages.ts（消息发送/加载/格式化 + 媒体 + 编辑/反应）**：

- `getMessages`, `loadOlderMessages`, `sendMessage`, `sendTyping`, `markRoomAsRead`, `getReadReceiptForRoom`, `redactEvent`, `editMessage`, `sendReaction`
- `formatTimelineEvent`, `extractDisplayName`, `formatMessage`, `formatMembershipEvent`, `getMessageType`, `getSenderInfo`
- `sendImage`, `sendFile`（媒体上传）
- `getBaseUrl`, `mxcToHttp`, `downloadAuthenticatedImage`, `imageCache`（媒体 URL）
- 需要动态 `import('matrix-js-sdk')`：6 处（getMessages/send 系列）+ 2 处（sendImage/sendFile）

**verification.ts（SAS 验证 + 屏蔽/忽略）**：

- `setupVerificationListeners`, `_setupVerificationRequestListeners`, `_setupVerifierListeners`
- `requestVerification`, `acceptVerificationRequest`, `confirmVerification`, `cancelVerification`, `isUserVerified`
- `getIgnoredUsers`, `isUserIgnored`, `blockUser`, `unblockUser`, `mutateIgnoredUsers`
- 不需要 `import('matrix-js-sdk')`，用 `matrix-js-sdk/lib/crypto-api` 子路径

**event-listeners.ts（事件监听注册）**：

- `setupEventListeners`（当前单函数 ~200 行，含 Sync/Timeline/Decrypt/Members/Presence/RoomState）
- 需要动态 `import('matrix-js-sdk')`：1 处

### 跨模块依赖

- `event-listeners.ts` → `messages.ts`（`formatMessage`, `formatMembershipEvent`）
- `event-listeners.ts` → `rooms.ts`（`_handleRoomInvite`, peer id 缓存更新）
- `messages.ts` → `rooms.ts`（`getSenderInfo` 需要房间成员信息）
- `verification.ts` → `rooms.ts`（`requestVerification` 需要 `getRooms` 找 DM）
- 所有模块 → `client.ts`（通过 context 获取 client 实例和状态）

---

## Phase 2: `ChatMessages.tsx` 拆分（1561 → 3-4 个文件）

### 目标结构

```
apps/web/src/components/Chat/
├── ChatMessages.tsx       ← 主组件 + header + 搜索 + 删除确认（~400行）
├── ChatMessageList.tsx    ← 滚动容器 + 消息分组 + 单条消息渲染（~600行）
├── ChatComposer.tsx       ← 输入框 + 文件附件 + Emoji + typing（~300行）
├── ChatMediaContent.tsx   ← Image/File/Audio/Video memo 组件 + lightbox + 辅助函数（~250行）
├── ChatList.tsx           ← 不动
├── UserInfoCard.tsx       ← 不动
├── index.ts
```

### 拆分内容

**ChatMessages.tsx 保留**：

- Props 定义（`ChatMessagesProps`, `Message` 类型）
- 聊天 header（返回、头像、标题、徽章、副标题）
- 搜索栏（`showSearch` + query + prev/next）
- 删除确认 AlertDialog
- 组装：`<ChatMessageList>` + `<ChatComposer>`
- state：`searchQuery`, `searchResults`, `showSearch`, `deleteConfirmId`, `lightboxSrc`

**ChatMessageList.tsx 提取**：

- 滚动容器 + `onScroll` 加载更多
- 骨架屏 / 空状态
- `messagesWithDates` 分组逻辑（`useMemo`）
- 日期分隔符 `DateSeparator`
- 系统消息渲染
- 单条消息行（头像、气泡、桌面 hover 操作、移动长按菜单、反应行、时间戳）
- `MessageStatus` 组件
- `TypingIndicator` 组件
- state：`editingMessageId`, `editingContent`, `reactionPickerMsgId`, `longPressMenuId`, `copiedId`

**ChatComposer.tsx 提取**：

- 离线横幅
- 隐藏文件 input + 回形针按钮
- 文本输入框 + `handleKeyDown`
- Emoji 选择器弹出层
- 发送按钮
- typing 防抖逻辑
- state：`inputValue`, `showEmojiPicker`

**ChatMediaContent.tsx 提取**：

- `ChatImageContent`, `ChatFileContent`, `ChatAudioContent`, `ChatVideoContent`（4 个 `React.memo` 组件）
- `useResolvedMediaUrl` hook
- `needsMatrixAuth`, `cleanDisplayName`, `shortenSystemContent` 辅助函数
- `formatFileSize` 辅助函数

---

## Phase 3: `ChatDrawer.tsx` 拆分（1367 → 3 个文件）

### 目标结构

```
apps/web/src/components/ChatDrawer/
├── ChatDrawer.tsx           ← Shell + header + 视图切换 + 验证状态（~500行）
├── RoomSettingsPanel.tsx    ← 房间设置面板（~250行）
├── hooks/useChatEffects.ts  ← 副作用 hooks（~400行）
├── VerificationDialog.tsx   ← 不动
├── NewChatDialog.tsx        ← 不动
├── index.ts
```

### 拆分内容

**ChatDrawer.tsx 保留**：

- Sheet 容器 + `SheetContent` + `SheetHeader`
- Header（标题、连接状态徽章、工具栏按钮）
- `renderView()` 视图切换（Creating / Invite / ChatMessages / ChatList）
- 拖放 overlay
- UserInfoCard 弹出
- VerificationDialog 调用
- 验证相关 state（`verificationOpen` 等）+ handlers
- `toDisplayRoom`, `toDisplayMessage`, `safeTimestamp` 转换函数

**RoomSettingsPanel.tsx 提取**：

- 当前 `showRoomSettings && currentRoom` 时渲染的完整面板
- 成员列表 + 头像点击
- 房间 ID + 复制按钮
- 加密徽章
- Props：`room`, `onBack`, `onMemberClick`, `t`

**hooks/useChatEffects.ts 提取**：

- `useEffect` — pending peer → DM 创建（`pendingPeerID` + `getOrCreateDirectRoom`）
- `useEffect` — room 选中 → mark read + load messages + read receipts
- `useEffect` — read receipt 事件监听
- `useEffect` — upload progress 事件
- `useEffect` — remote edit / reaction 事件
- `useEffect` — verification Matrix 事件监听

---

## 执行约束

1. `matrixClient` 单例所有公共方法签名不变
2. `packages/core/services/matrix/index.ts` 导出不变
3. TypeScript 严格模式 + ESLint 零告警（刚清零了 50 个告警）
4. 保留 `await import('matrix-js-sdk')` 动态导入模式（tree-shaking + lazy load）
5. 不改变任何运行时行为

## 验证方式

### 编译检查（每步必须通过）

```bash
# TypeScript
npx tsc --noEmit -p packages/core/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json

# ESLint
npx eslint packages/core/services/matrix/ --max-warnings 0
npx eslint apps/web/src/components/Chat/ apps/web/src/components/ChatDrawer/ --max-warnings 0
```

### 导出兼容检查

重构前记录公开 API，重构后 diff 确认无遗漏：

```bash
grep -E '^\s+(async\s+)?[a-zA-Z]+\(' packages/core/services/matrix/client.ts | grep -v private | grep -v '//'
```

### 功能手动验证清单

| 场景          | 操作                                   |
| ------------- | -------------------------------------- |
| 初始化 + 登录 | 刷新页面，聊天自动连接显示 "Connected" |
| 发送文本消息  | 打开 DM，发文字，对方收到              |
| 发送图片/文件 | 附件上传，对方能下载                   |
| 加载历史消息  | 滚动到顶部触发加载更多                 |
| 编辑消息      | hover 编辑，确认后显示 "(edited)"      |
| Emoji 反应    | 反应按钮选 emoji                       |
| 创建 DM       | New Chat → 搜索用户 → 发起对话         |
| 房间设置      | 查看成员列表，复制房间 ID              |
| 邀请接受/拒绝 | 收到邀请，Accept / Decline             |
| 设备验证      | SAS 验证 Emoji 匹配确认                |
| 屏蔽用户      | UserInfoCard → Block                   |
| 在线状态      | 对方上下线状态更新                     |
| 拖放上传      | 拖文件到聊天区域                       |
| E2EE          | 加密房间锁图标，消息正常解密           |

### Matrix E2E 测试（已有 8 个 PASS）

```bash
# 本地 E2E 环境
pnpm test:e2e --grep "matrix"
```

## 执行顺序

Phase 1 → Phase 2 → Phase 3，每个 Phase 完成后编译检查 + 功能验证。
