/**
 * Merge individual journey manifests into a single demo-output/manifest.json.
 *
 * Usage: npx tsx e2e/merge-manifests.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, 'demo-output');
const PERSONAS = ['seller', 'buyer', 'standalone'];

interface ManifestEntry {
  id: string;
  title: string;
  description: string;
  phase: string;
  reviewFocus: string;
  persona: string;
  files: { mobile: string; desktop: string };
}

const merged: ManifestEntry[] = [];

for (const persona of PERSONAS) {
  const manifestPath = path.join(OUTPUT_DIR, persona, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const entries: ManifestEntry[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    merged.push(...entries);
    console.log(`[merge] ${persona}: ${entries.length} entries`);
  } else {
    console.warn(`[merge] ${persona}/manifest.json not found — skipping`);
  }
}

const outputPath = path.join(OUTPUT_DIR, 'manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
console.log(`[merge] Combined manifest: ${merged.length} entries → ${outputPath}`);

const summary = PERSONAS.map(p => {
  const count = merged.filter(e => e.persona === p).length;
  return `${p}: ${count}`;
}).join(', ');
console.log(`[merge] Summary: ${summary}`);
console.log(
  `[merge] Total screenshots expected: ${merged.length * 2} (${merged.length} steps × 2 viewports)`
);
