/**
 * Outpost stub — Discord Activity provider is stripped at build time.
 */
export function DiscordActivityProvider({ children }: { children: import('react').ReactNode }) {
  return <>{children}</>;
}

export function useDiscordActivity() {
  return {
    isAvailable: false,
    isReady: false,
    theme: null as 'light' | 'dark' | null,
    user: null,
    accessToken: null,
    channelId: null,
    guildId: null,
    openExternalLink: () => {},
  };
}

export default DiscordActivityProvider;
