# Makefile — OpenAPI codegen pipeline
#
# Orchestrates: dump specs from Go backends → merge → generate TS types + paths
#
# Env vars for backend worktree paths (override for CI or non-standard layouts):
#   SPEC_HOSTING_PATH  — mobazha_hosting repo root
#   SPEC_NODE_PATH     — mobazha repo root
#   SPEC_SEARCH_PATH   — mobazha.info repo root

SPEC_HOSTING_PATH ?= /Users/mingfeng/go/src/github.com/mobazha/mobazha_hosting
SPEC_NODE_PATH    ?= /Users/mingfeng/go/src/github.com/mobazha/mobazha
SPEC_SEARCH_PATH  ?= /Users/mingfeng/go/src/github.com/mobazha/mobazha.info

.PHONY: openapi openapi-dump openapi-dump-hosting openapi-dump-node openapi-dump-search \
        openapi-merge openapi-codegen openapi-check

## Full pipeline: dump + merge + codegen
openapi: openapi-dump openapi-merge openapi-codegen

## Dump specs from all three Go backends
openapi-dump: openapi-dump-hosting openapi-dump-node openapi-dump-search

openapi-dump-hosting:
	@echo "=== Dumping hosting spec ==="
	cd $(SPEC_HOSTING_PATH) && go run -tags goolm ./cmd/gen-openapi

openapi-dump-node:
	@echo "=== Dumping node spec ==="
	cd $(SPEC_NODE_PATH) && go run -tags goolm ./cmd/gen-openapi

openapi-dump-search:
	@echo "=== Dumping search spec ==="
	cd $(SPEC_SEARCH_PATH)/backend && go run ./cmd/gen-openapi

## Merge individual specs into unified openapi.json
openapi-merge:
	@echo "=== Merging specs ==="
	SPEC_HOSTING_PATH=$(SPEC_HOSTING_PATH) \
	SPEC_NODE_PATH=$(SPEC_NODE_PATH) \
	SPEC_SEARCH_PATH=$(SPEC_SEARCH_PATH) \
	node scripts/merge-specs.mjs

## Generate TS types + API path constants from merged spec
openapi-codegen:
	@echo "=== Generating TypeScript types + API path constants ==="
	pnpm --filter @mobazha/core generate:api

## Check that generated files haven't drifted (CI guard)
openapi-check:
	bash scripts/check-codegen-drift.sh
