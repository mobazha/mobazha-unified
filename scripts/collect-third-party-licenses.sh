#!/usr/bin/env sh
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 fengzie and the respective contributors.

set -eu

destination="${1:-third-party-licenses}"
mkdir -p "$destination"

copy_first() {
  pattern="$1"
  output="$2"
  source_file="$(find node_modules/.pnpm -path "$pattern" -type f -print -quit)"
  if [ -z "$source_file" ]; then
    echo "missing third-party license matching $pattern" >&2
    exit 1
  fi
  cp "$source_file" "$destination/$output"
}

copy_first '*/openpgp/LICENSE' 'openpgp-LGPL-3.0.txt'
copy_first '*/rpc-websockets/LICENSE' 'rpc-websockets-LGPL-3.0.txt'
copy_first '*/text-encoding-utf-8/LICENSE.md' 'text-encoding-utf-8-Unlicense.md'
copy_first '*/sharp/LICENSE' 'sharp-Apache-2.0.txt'

cp LICENSE NOTICE THIRD_PARTY_NOTICES.md "$destination/"
