# Public release preparation — 2026-07-02

This publication prepares Mobazha Unified with the current Marketplace,
operator, collectibles, runtime-capability, receiving-account and generic
sovereign frontend work. The release retains an individual, reviewable commit
history instead of publishing a squashed source snapshot.

The default fallback manifest is restricted to BTC, BCH and LTC. Additional
compatible backends remain supported only through the versioned runtime
capability response; the frontend may narrow that response but does not invent
capabilities. Additional chain and fiat compatibility code is not part of the
default payment allowlist.

Release gates cover the exact three-chain manifest, release boundaries, closed
connector dependencies, source attribution, generated API drift, TypeScript,
unit tests and production builds.
