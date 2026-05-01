#!/usr/bin/env node
// merge-specs.mjs — AH-1.6
//
// Merges three backend OpenAPI 3.1 specs into a single unified spec.
// Schema names are prefixed to avoid collisions and all $ref pointers
// are recursively rewritten to match.
//
// Usage:
//   node scripts/merge-specs.mjs
//
// Env vars (override .spec-sources.json defaults):
//   SPEC_HOSTING_PATH, SPEC_NODE_PATH, SPEC_SEARCH_PATH

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 1. Resolve source spec paths from .spec-sources.json + env vars
// ---------------------------------------------------------------------------

function resolveSpecSources() {
  const raw = readFileSync(resolve(__dirname, '.spec-sources.json'), 'utf8');
  const sources = JSON.parse(raw);
  const resolved = {};
  for (const [key, tmpl] of Object.entries(sources)) {
    resolved[key] = tmpl.replace(/\$\{(\w+):-([^}]+)\}/g, (_m, envVar, fallback) => {
      return process.env[envVar] || fallback;
    });
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// 2. Namespace schemas + recursive $ref rewriting
// ---------------------------------------------------------------------------

const SCHEMA_REF_PREFIX = '#/components/schemas/';

function rewriteRefs(obj, prefix) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => rewriteRefs(item, prefix));
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith(SCHEMA_REF_PREFIX)) {
      const schemaName = value.slice(SCHEMA_REF_PREFIX.length);
      result[key] = `${SCHEMA_REF_PREFIX}${prefix}${schemaName}`;
    } else {
      result[key] = rewriteRefs(value, prefix);
    }
  }
  return result;
}

function namespaceSpec(spec, prefix) {
  const schemas = spec.components?.schemas;
  if (schemas) {
    const prefixed = {};
    for (const [name, schema] of Object.entries(schemas)) {
      prefixed[`${prefix}${name}`] = rewriteRefs(schema, prefix);
    }
    spec.components.schemas = prefixed;
  }

  if (spec.paths) {
    spec.paths = rewriteRefs(spec.paths, prefix);
  }

  return spec;
}

// ---------------------------------------------------------------------------
// 3. Merge
// ---------------------------------------------------------------------------

function mergeSpecs(specs) {
  const merged = {
    openapi: '3.1.0',
    info: {
      title: 'Mobazha Unified API',
      version: '1.0.0',
      description: 'Merged OpenAPI spec from Hosting, Node, and Search services.',
    },
    servers: [{ url: '/', description: 'Unified gateway' }],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {},
    },
  };

  for (const { spec, prefix } of specs) {
    const namespaced = namespaceSpec(structuredClone(spec), prefix);

    // Merge paths (prefixes are non-overlapping)
    for (const [path, methods] of Object.entries(namespaced.paths || {})) {
      if (merged.paths[path]) {
        Object.assign(merged.paths[path], methods);
      } else {
        merged.paths[path] = methods;
      }
    }

    // Merge schemas
    Object.assign(
      merged.components.schemas,
      namespaced.components?.schemas || {},
    );

    // Merge security schemes (no prefix — names must be globally unique)
    for (const [name, scheme] of Object.entries(namespaced.components?.securitySchemes || {})) {
      if (merged.components.securitySchemes[name]) {
        throw new Error(
          `Security scheme collision: "${name}" defined by multiple services. ` +
          `Rename one to avoid ambiguity.`,
        );
      }
      merged.components.securitySchemes[name] = scheme;
    }
  }

  // Sort paths for deterministic output
  const sortedPaths = {};
  for (const key of Object.keys(merged.paths).sort()) {
    sortedPaths[key] = merged.paths[key];
  }
  merged.paths = sortedPaths;

  return merged;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const sources = resolveSpecSources();
const configs = [
  { key: 'hosting', prefix: 'Platform_' },
  { key: 'node', prefix: 'Node_' },
  { key: 'search', prefix: 'Search_' },
];

const specs = configs.map(({ key, prefix }) => {
  const path = sources[key];
  console.log(`Reading ${key}: ${path}`);
  const raw = readFileSync(path, 'utf8');
  return { spec: JSON.parse(raw), prefix };
});

const merged = mergeSpecs(specs);

const outDir = resolve(__dirname, '..', 'packages', 'core', 'api-spec');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'openapi.json');
writeFileSync(outPath, JSON.stringify(merged, null, 2) + '\n');

const pathCount = Object.keys(merged.paths).length;
const schemaCount = Object.keys(merged.components.schemas).length;
console.log(`\nWrote ${outPath}`);
console.log(`  paths: ${pathCount}, schemas: ${schemaCount}`);
