# Connect Mobazha Unified to a Local Node

Start a Mobazha Node before running the frontend. The default local gateway is
`http://127.0.0.1:5102`.

## Start the Node on testnet

Follow the Node [self-hosting guide](https://github.com/mobazha/mobazha/blob/main/docs/getting-started/SELF_HOSTING.md),
then start it with:

```bash
./mobazha start --testnet
```

Confirm that `http://127.0.0.1:5102` is reachable before starting Unified.

## Start Unified

From the `mobazha-unified` repository:

```bash
corepack pnpm install --frozen-lockfile

NEXT_PUBLIC_ENV_MODE=standalone \
NEXT_PUBLIC_AUTH_MODE=basic \
NEXT_PUBLIC_API_URL=http://127.0.0.1:5102 \
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5102 \
corepack pnpm dev:vite
```

The frontend is available at `http://127.0.0.1:3000` by default.

## How capability discovery works

After startup, Unified requests the backend runtime configuration and renders
only the experiences and payment methods advertised by the Node. A source file
or frontend adapter does not enable a capability by itself.

If a feature is missing:

1. confirm that the Node is reachable;
2. inspect the browser request to the runtime configuration endpoint;
3. confirm that the seller and Node enable the capability; and
4. check provider readiness for integrations that require an external runtime.

Do not work around missing capability data by enabling UI routes locally. The
backend must remain authoritative.
