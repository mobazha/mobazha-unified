import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
const manifestUrl = process.env.DOCS_MANIFEST_URL ?? 'https://docs.mobazha.org/sources.json';
const manifestPath = process.env.DOCS_MANIFEST_PATH;
const failures = [];
const fail = message => failures.push(message);

async function fetchWithRetry(url, parseJson = false) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
        headers: { 'user-agent': 'mobazha-unified-release-docs-check/1.0' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parseJson ? response.json() : response;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
  }
  throw new Error(`${url}: ${lastError?.message ?? 'request failed'}`);
}

if (!tag || !/^v[0-9]+\.[0-9]+\.[0-9]+(?:[-.][0-9A-Za-z.-]+)?$/.test(tag)) {
  fail(`release tag is missing or invalid: ${tag ?? '<missing>'}`);
}

if (tag) {
  const releaseDocument = `docs/releases/${tag}.md`;
  if (!existsSync(releaseDocument)) {
    fail(`${releaseDocument} is missing`);
  } else {
    const source = readFileSync(releaseDocument, 'utf8');
    for (const url of [
      'https://docs.mobazha.org/project/release-scope',
      'https://docs.mobazha.org/build/runtime-capabilities',
    ]) {
      if (!source.includes(url)) fail(`${releaseDocument} is missing ${url}`);
    }
  }
}

let manifest;
try {
  manifest = manifestPath
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : await fetchWithRetry(manifestUrl, true);
} catch (error) {
  fail(`unable to read documentation source manifest: ${error.message}`);
}

const expectedRevision = process.env.GITHUB_SHA
  ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const reviewedRevision = manifest?.sources?.find(source => source.id === 'public-client')?.revision;
if (reviewedRevision !== expectedRevision) {
  fail(`docs source revision ${reviewedRevision ?? '<missing>'} does not match release ${expectedRevision}`);
}

for (const url of [
  'https://docs.mobazha.org/start',
  'https://docs.mobazha.org/build/runtime-capabilities',
  'https://docs.mobazha.org/project/release-scope',
]) {
  try {
    await fetchWithRetry(url);
  } catch (error) {
    fail(error.message);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`release documentation check failed: ${failure}`);
  process.exit(1);
}

console.log(`release documentation check passed: ${tag} at ${expectedRevision.slice(0, 12)}`);
