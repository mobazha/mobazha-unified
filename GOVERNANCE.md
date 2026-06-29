# Project Governance

Mobazha Unified is maintained by the Mobazha organization with contributions from the community.

## Decision making

- Routine fixes and documentation changes are decided through pull-request review.
- Changes to public contracts, runtime capabilities, payment execution, security boundaries, licensing, or repository governance require a design review before implementation.
- The connected backend remains authoritative for edition policy, order state, payment verification, settlement, audit, and key custody.
- Frontend support for a capability does not add it to the default Community Edition.

Maintainers seek rough consensus and use technical evidence, compatibility, accessibility, security, and project scope to resolve disagreements. The Mobazha organization retains final responsibility for releases, security responses, trademarks, and appointing maintainers.

## Maintainers

Maintainers can review and merge pull requests, triage issues, manage releases, and enforce community policy. Access should follow least privilege and may be removed when it is no longer required.

## Releases

Releases are built from protected tags on `main` after required checks pass. Release notes must identify compatibility changes, capability changes, security fixes, known limitations, and artifact verification instructions.
