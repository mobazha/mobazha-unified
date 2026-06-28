# Wallet Integration

## Scope

Mobazha Unified connects to user-controlled browser wallets only when an enabled
payment or asset flow requires client-side signing. UTXO address payments are
backend-monitored and do not require this connector.

The public core currently supports standard injected providers:

- EVM providers implementing EIP-1193
- Injected Solana providers exposing `connect`, `disconnect` and `publicKey`

The compatibility exports remain named `AppKitProvider` and `useAppKit` to avoid
breaking applications during migration. They no longer import or initialize the
Reown SDK.

## Runtime capability rule

A detected wallet never enables a payment method by itself. Payment visibility
comes from the backend runtime capability snapshot and seller configuration. The
wallet connector is initialized only when the user enters a flow that needs it.

## Public API

```tsx
import { AppKitProvider, useWallet } from '@mobazha/core';

function Root({ children }: { children: React.ReactNode }) {
  return <AppKitProvider>{children}</AppKitProvider>;
}

function ConnectButton() {
  const { connect, isConnected, walletInfo } = useWallet();
  return (
    <button onClick={() => void connect()}>
      {isConnected ? walletInfo?.address : 'Connect wallet'}
    </button>
  );
}
```

## Security requirements

- Never request a seed phrase or private key.
- Treat injected providers as untrusted external interfaces.
- Validate chain ID, account and transaction payload immediately before signing.
- Do not infer payment availability from wallet presence.
- Do not persist provider objects or signing material.
- Present transaction destination, amount and network before user confirmation.

## Plugin direction

QR pairing, wallet catalogs and other connector-specific UX should be delivered
through optional adapters. Each adapter requires its own dependency-license,
privacy, CSP and supply-chain review. An adapter must not change the backend
capability contract or add payment methods that the backend did not advertise.

The adapter boundary should expose provider-neutral operations:

- connect by namespace
- disconnect
- read account and network
- switch a supported network
- obtain the standard provider used by transaction executors

This keeps the shared frontend on one `main` branch while allowing deployments to
add integrations without changing the MPL core.
