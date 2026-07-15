#!/usr/bin/env bash
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 fengzie and the respective contributors.
#
# Production dependency audit.
#
# Replaces `pnpm audit`, which cannot work any more: it calls
# registry.npmjs.org/-/npm/v1/security/audits, and npm retired that endpoint
# (HTTP 410 "This endpoint is being retired"). pnpm 9 and 10 both still call
# it, so there is no version to upgrade to — the command fails for everyone,
# on every run, regardless of the dependency tree.
#
# osv-scanner reads pnpm-lock.yaml directly and has no such endpoint. It exits
# non-zero on ANY advisory though, including LOW, so we gate ourselves at
# CVSS >= 7.0 — the "high" that `--audit-level=high` used to mean.
#
# Gate on the CVSS score, NOT on GHSA's own severity label: they disagree, and
# not by a little. GHSA-3qcw-2rhx-2726 (turbo) is labelled LOW while its CVSS
# v3 vector is AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H — 9.8, critical. A
# label-based gate waves that through. SARIF output carries the computed score
# in security-severity, so that is what we read.
#
# Usage: ./scripts/security-audit.sh
# Requires: jq. Downloads osv-scanner if it is not on PATH.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

OSV_VERSION="${OSV_VERSION:-v2.4.0}"
SEVERITY_THRESHOLD="${SEVERITY_THRESHOLD:-7.0}"

if command -v osv-scanner >/dev/null 2>&1; then
  osv_bin="$(command -v osv-scanner)"
else
  case "$(uname -s)" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) echo "security-audit: unsupported OS $(uname -s)" >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) arch=amd64 ;;
    arm64 | aarch64) arch=arm64 ;;
    *) echo "security-audit: unsupported arch $(uname -m)" >&2; exit 1 ;;
  esac

  osv_bin="$(mktemp -d)/osv-scanner"
  url="https://github.com/google/osv-scanner/releases/download/${OSV_VERSION}/osv-scanner_${os}_${arch}"
  echo "security-audit: fetching osv-scanner ${OSV_VERSION}"
  curl -fsSL -o "$osv_bin" "$url"
  chmod +x "$osv_bin"
fi

report="$(mktemp)"
trap 'rm -f "$report"' EXIT

# Exits 1 when it finds anything at all — severity is our call, not its.
"$osv_bin" scan source --lockfile=pnpm-lock.yaml --format sarif >"$report" 2>/dev/null || true

if ! jq -e '.runs' "$report" >/dev/null 2>&1; then
  echo "security-audit: osv-scanner produced no parseable SARIF report" >&2
  exit 1
fi

blocking="$(jq -r --argjson threshold "$SEVERITY_THRESHOLD" '
  [ .runs[]?.tool.driver.rules[]?
    | select((.properties["security-severity"] // "0" | tonumber) >= $threshold)
    | "  \(.properties["security-severity"])\t\(.id)\t\(.shortDescription.text // "")"
  ] | unique | .[]
' "$report")"

total="$(jq '[.runs[]?.tool.driver.rules[]?.id] | unique | length' "$report")"

if [[ -n "$blocking" ]]; then
  echo "security-audit: advisories at or above CVSS ${SEVERITY_THRESHOLD}:" >&2
  echo "$blocking" >&2
  echo "" >&2
  echo "Upgrade the package, or pin a patched version via pnpm.overrides in package.json." >&2
  exit 1
fi

echo "security-audit: nothing at or above CVSS ${SEVERITY_THRESHOLD} (${total} lower-severity advisories not blocking)"
