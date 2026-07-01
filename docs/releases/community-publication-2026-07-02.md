# Community publication audit — 2026-07-02

This publication preserves the established public history rooted at
`d37c1cc23b10eea3682c9582ce021c7f4955090e`. It continues from public base
`72fc66ac6c93b32deef6ca4804e0161529515275` and replays 52 reviewed source
commits through private source cutoff
`90ee662e4efd74b615fd682fb25feea863914e35`.

The reviewed projection includes the current Marketplace, operator,
collectibles, runtime-capability, receiving-account and generic sovereign
frontend work. Source commits are retained as individual public commits with
their original source commit IDs in the commit trailers; the release is not a
squashed source snapshot.

The Community fallback manifest is restricted to BTC, BCH and LTC. Richer
compatible backends remain supported only through the versioned runtime
capability response; the frontend may narrow that response but does not invent
capabilities. Zcash, EVM, Solana, Monero and fiat compatibility code is not part
of the Community default payment allowlist.

Release gates cover the exact three-chain manifest, private product identity,
closed connector dependencies, source attribution, generated API drift,
TypeScript, unit tests and production builds.
