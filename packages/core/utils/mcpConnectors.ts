/**
 * MCP client connector definitions — 11 clients × 4 connection modes.
 *
 * Each client specifies how to generate connection artifacts (Deep Link URL,
 * CLI command, remote URL guidance, or JSON config snippet) given an MCP
 * endpoint URL (Streamable HTTP) and a Bearer token.
 */

export type ConnectMode = 'deeplink' | 'cli' | 'remote-url' | 'json-config';
export type ClientAudience = 'owner' | 'developer';

/**
 * Privacy risk classification — used by Outpost mode to filter cloud-only clients.
 *
 * - `local-capable`: Inference can run locally with zero or trivial configuration.
 *   Example: OpenClaw (BYO model).
 * - `mixed`: Client can be configured for local inference but defaults to cloud.
 *   Examples: Cursor, VS Code, Claude Code, Windsurf, OpenCode, Cline (defaults to
 *   Anthropic/OpenRouter; local providers like Ollama require explicit setup).
 * - `cloud-only`: Inference happens in the vendor's cloud and the end user cannot
 *   redirect it to a local LLM. Examples: ChatGPT Desktop, Claude Desktop, Codex.
 *
 * Outpost mode default behavior:
 * - `local-capable`: shown by default
 * - `mixed`: shown with a yellow risk badge
 * - `cloud-only`: hidden by default, revealed only when user opts in via
 *   "Show high-risk AI clients" setting (records explicit acknowledgement)
 */
export type ClientRisk = 'local-capable' | 'mixed' | 'cloud-only';

export interface McpClient {
  id: string;
  name: string;
  mode: ConnectMode;
  audience: ClientAudience;
  /** Privacy risk classification — controls Outpost mode visibility (see ClientRisk). */
  risk: ClientRisk;
  tagline?: string;
}

export const MCP_CLIENTS: McpClient[] = [
  // --- For store owners ---
  {
    id: 'chatgpt-desktop',
    name: 'ChatGPT Desktop',
    mode: 'remote-url',
    audience: 'owner',
    risk: 'cloud-only',
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    mode: 'remote-url',
    audience: 'owner',
    risk: 'cloud-only',
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    mode: 'cli',
    audience: 'owner',
    risk: 'local-capable',
    tagline: 'Manage via WhatsApp & Telegram',
  },
  // --- For developers ---
  { id: 'cursor', name: 'Cursor', mode: 'deeplink', audience: 'developer', risk: 'mixed' },
  { id: 'vscode', name: 'VS Code', mode: 'deeplink', audience: 'developer', risk: 'mixed' },
  { id: 'claude-code', name: 'Claude Code', mode: 'cli', audience: 'developer', risk: 'mixed' },
  { id: 'windsurf', name: 'Windsurf', mode: 'json-config', audience: 'developer', risk: 'mixed' },
  { id: 'codex', name: 'Codex', mode: 'remote-url', audience: 'developer', risk: 'cloud-only' },
  { id: 'opencode', name: 'OpenCode', mode: 'cli', audience: 'developer', risk: 'mixed' },
  {
    id: 'cline',
    name: 'Cline',
    mode: 'json-config',
    audience: 'developer',
    risk: 'mixed',
  },
];

/**
 * Filter MCP_CLIENTS based on privacy mode.
 *
 * @param outpost When true, applies Outpost privacy filtering rules
 * @param showHighRisk When true (and outpost), reveals cloud-only clients (user opted in)
 */
export function filterMcpClients(outpost: boolean, showHighRisk: boolean): McpClient[] {
  if (!outpost) return MCP_CLIENTS;
  if (showHighRisk) return MCP_CLIENTS;
  return MCP_CLIENTS.filter(c => c.risk !== 'cloud-only');
}

// ---------------------------------------------------------------------------
// Mode A: Deep Link generators
// ---------------------------------------------------------------------------

export function generateCursorDeepLink(storeName: string, mcpUrl: string, token: string): string {
  const config = {
    type: 'http' as const,
    url: mcpUrl,
    headers: { Authorization: `Bearer ${token}` },
  };
  const base64Config = btoa(JSON.stringify(config));
  const name = `mobazha-${storeName}`;
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${base64Config}`;
}

export function generateVSCodeDeepLink(storeName: string, mcpUrl: string, token: string): string {
  const config = {
    name: `mobazha-${storeName}`,
    type: 'http',
    url: mcpUrl,
    headers: { Authorization: `Bearer ${token}` },
  };
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify(config))}`;
}

// ---------------------------------------------------------------------------
// Mode B: CLI command generators
// ---------------------------------------------------------------------------

export function generateClaudeCodeCli(storeName: string, mcpUrl: string, token: string): string {
  return `claude mcp add mobazha-${storeName} --transport http --url "${mcpUrl}" --header "Authorization: Bearer ${token}"`;
}

export function generateOpenClawCli(storeName: string, mcpUrl: string, token: string): string {
  const config = JSON.stringify({
    type: 'http',
    url: mcpUrl,
    headers: { Authorization: `Bearer ${token}` },
  });
  return `openclaw mcp set mobazha-${storeName} '${config}'`;
}

export function generateOpenCodeCli(storeName: string, mcpUrl: string, token: string): string {
  return `opencode mcp add mobazha-${storeName} --transport http --url "${mcpUrl}" --header "Authorization: Bearer ${token}"`;
}

// ---------------------------------------------------------------------------
// Mode D: JSON config generators
// ---------------------------------------------------------------------------

export interface JsonConfigResult {
  json: string;
  configPath: string;
  configPathWindows?: string;
}

export function generateWindsurfConfig(
  storeName: string,
  mcpUrl: string,
  token: string
): JsonConfigResult {
  const config = {
    [`mobazha-${storeName}`]: {
      serverUrl: mcpUrl,
      headers: { Authorization: `Bearer ${token}` },
    },
  };
  return {
    json: JSON.stringify(config, null, 2),
    configPath: '~/.codeium/windsurf/mcp_config.json',
    configPathWindows: '%APPDATA%\\Codeium\\windsurf\\mcp_config.json',
  };
}

export function generateClineConfig(
  storeName: string,
  mcpUrl: string,
  token: string
): JsonConfigResult {
  const config = {
    mcpServers: {
      [`mobazha-${storeName}`]: {
        url: mcpUrl,
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  };
  return {
    json: JSON.stringify(config, null, 2),
    configPath: 'Cline Settings → MCP Servers',
  };
}

export function generateGenericConfig(
  storeName: string,
  mcpUrl: string,
  token: string
): JsonConfigResult {
  const config = {
    mcpServers: {
      [`mobazha-${storeName}`]: {
        transport: 'http',
        url: mcpUrl,
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  };
  return {
    json: JSON.stringify(config, null, 2),
    configPath: '(varies by client)',
  };
}

// ---------------------------------------------------------------------------
// Unified connector dispatcher
// ---------------------------------------------------------------------------

export interface ConnectArtifact {
  mode: ConnectMode;
  deepLink?: string;
  cliCommand?: string;
  mcpUrl?: string;
  token?: string;
  jsonConfig?: JsonConfigResult;
  guidanceSteps?: string[];
}

export function generateConnectArtifact(
  clientId: string,
  storeName: string,
  mcpUrl: string,
  token: string
): ConnectArtifact {
  switch (clientId) {
    case 'cursor':
      return {
        mode: 'deeplink',
        deepLink: generateCursorDeepLink(storeName, mcpUrl, token),
        mcpUrl,
        token,
      };
    case 'vscode':
      return {
        mode: 'deeplink',
        deepLink: generateVSCodeDeepLink(storeName, mcpUrl, token),
        mcpUrl,
        token,
      };

    case 'claude-code':
      return { mode: 'cli', cliCommand: generateClaudeCodeCli(storeName, mcpUrl, token) };
    case 'codex':
      return {
        mode: 'remote-url',
        mcpUrl,
        token,
        guidanceSteps: [
          'Open Codex → Settings → MCP servers → "+ Add server"',
          'Select "Streamable HTTP", paste the URL below, then add a Header with key "Authorization" and value "Bearer <token>"',
        ],
      };
    case 'openclaw':
      return { mode: 'cli', cliCommand: generateOpenClawCli(storeName, mcpUrl, token) };
    case 'opencode':
      return { mode: 'cli', cliCommand: generateOpenCodeCli(storeName, mcpUrl, token) };

    case 'chatgpt-desktop':
      return {
        mode: 'remote-url',
        mcpUrl,
        token,
        guidanceSteps: [
          'Open ChatGPT Desktop → Settings → Apps → Advanced Settings → Developer Mode',
          'Paste the MCP URL below and save',
        ],
      };
    case 'claude-desktop':
      return {
        mode: 'remote-url',
        mcpUrl,
        token,
        guidanceSteps: [
          'Open Claude Desktop → Settings → Connectors → "Add custom connector"',
          'Paste the MCP URL below → Add → Enable the connector in chat',
        ],
      };

    case 'windsurf':
      return { mode: 'json-config', jsonConfig: generateWindsurfConfig(storeName, mcpUrl, token) };
    case 'cline':
      return { mode: 'json-config', jsonConfig: generateClineConfig(storeName, mcpUrl, token) };

    default:
      return { mode: 'json-config', jsonConfig: generateGenericConfig(storeName, mcpUrl, token) };
  }
}

/** Suggested prompts shown after successful connection */
export const POST_CONNECT_PROMPTS = [
  'List my store products',
  "Show today's orders",
  'Draft a product listing for vintage cameras',
];
