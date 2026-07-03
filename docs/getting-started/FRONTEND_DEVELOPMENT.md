# Frontend Development

## Requirements

- Node.js 20 or newer
- pnpm 9.15.4 through Corepack
- A compatible Mobazha backend

## Install and run

```bash
git clone https://github.com/mobazha/mobazha-unified.git
cd mobazha-unified
corepack pnpm install --frozen-lockfile
```

Follow [Connect to a Local Node](./CONNECT_TO_NODE.md) to run the Vite frontend
against a self-hosted backend.

## Common checks

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @mobazha/web build
corepack pnpm --filter @mobazha/web build:next
```

Validate the default release boundary with:

```bash
corepack pnpm community:check
```

The command name is retained as an internal compatibility identifier; it is not
a separate product or frontend edition.

## Development principles

- Consume backend capabilities through the shared typed projections.
- Keep Vite and Next.js provider order and behavior equivalent.
- Fail closed until authoritative runtime capabilities are available.
- Keep payment and wallet adapters optional and provider-neutral.
- Add focused tests for route, capability, and checkout behavior changes.

Before opening a pull request, read [CONTRIBUTING.md](../../CONTRIBUTING.md) and
sign off commits under the [Developer Certificate of Origin](../../DCO.md).
