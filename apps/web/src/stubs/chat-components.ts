/**
 * Outpost stub — Chat UI components are stripped at build time.
 * Exports named stubs matching the public API of Chat, ChatDrawer,
 * ChatFloatingButton barrel exports plus individual file imports.
 */

export function ChatList() {
  return null;
}
export type ChatListProps = Record<string, unknown>;
export type ChatRoom = Record<string, unknown>;

export function ChatMessages() {
  return null;
}
export type ChatMessagesProps = Record<string, unknown>;
export type Message = Record<string, unknown>;

export function ChatDrawer() {
  return null;
}
export type ChatDrawerProps = Record<string, unknown>;

export function ChatFloatingButton() {
  return null;
}
export type ChatFloatingButtonProps = Record<string, unknown>;

export function ChatMediaContent() {
  return null;
}
export function ChatComposer() {
  return null;
}
export function ChatMessageList() {
  return null;
}
export function UserInfoCard() {
  return null;
}
export function NewChatDialog() {
  return null;
}
export function RoomSettingsPanel() {
  return null;
}
export function VerificationDialog() {
  return null;
}

export function useChatViewLogic(..._args: unknown[]) {
  return {
    rooms: [],
    invites: [],
    currentRoom: null,
    messages: [],
    isLoading: false,
    sendMessage: async () => {},
    joinRoom: async () => {},
    leaveRoom: async () => {},
    setCurrentRoom: () => {},
    startNewChat: async () => '',
  };
}

export function useChatEffects() {}

export default ChatList;
