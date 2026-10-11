// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
/* global process, console */

/**
 * i18n guard — blocks the classes of "mixed language" defects that review keeps
 * catching, which the existing key-parity check (check-locale-missing-keys.mjs)
 * cannot see.
 *
 * Checks
 *   A. hardcoded user-visible text in components (JSX text + visible attributes)
 *   B. wrong-script characters inside a locale file (e.g. CJK left in en/de/pt)
 *   C. non-English `defaultValue` passed to t(), which leaks that language as a fallback
 *   D. value still identical to English in a non-English locale (report; blocking in --strict)
 *   E. locale key parity against en (missing / extra)
 *
 * Usage
 *   node scripts/check-i18n.mjs [--all] [--strict] [--json] [--report <file>]
 *   node scripts/check-i18n.mjs --changed           # only files changed in git (pre-commit)
 *
 * Exit code 1 when a blocking violation is found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, 'packages/core/i18n/locales');
const LOCALES = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt'];
const SCAN_DIRS = [
  'apps/web/src',
  'apps/extension/src',
  'packages/ui/src',
  'packages/commerce-kit/src',
];

const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const asJson = argv.includes('--json');
const changedOnly = argv.includes('--changed');
const writeBaseline = argv.includes('--write-baseline');
const reportIdx = argv.indexOf('--report');
const reportPath = reportIdx >= 0 ? argv[reportIdx + 1] : null;
const BASELINE_FILE = path.join(ROOT, 'scripts/.i18n-baseline.json');

/** Characters that must never appear in a locale file of the given language. */
const FORBIDDEN = {
  en: /[\u3040-\u30ff\uac00-\ud7af\u4e00-\u9fff]/,
  es: /[\u3040-\u30ff\uac00-\ud7af\u4e00-\u9fff\u0400-\u04ff]/,
  fr: /[\u3040-\u30ff\uac00-\ud7af\u4e00-\u9fff\u0400-\u04ff]/,
  de: /[\u3040-\u30ff\uac00-\ud7af\u4e00-\u9fff\u0400-\u04ff]/,
  pt: /[\u3040-\u30ff\uac00-\ud7af\u4e00-\u9fff\u0400-\u04ff]/,
  ru: /[\u3040-\u30ff\uac00-\ud7af\u4e00-\u9fff]/,
  ja: /[\uac00-\ud7af\u4e00-\u9fff\u0400-\u04ff]/, // ja may use kana (and kanji, see allowKana below)
  ko: /[\u3040-\u30ff\u0400-\u04ff]/,
  zh: /[\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]/,
};

// Japanese legitimately uses Han characters; only flag Hangul/Cyrillic there.
FORBIDDEN.ja = /[\uac00-\ud7af\u0400-\u04ff]/;

const CJK_ANY = /[\u3040-\u30ff\uac00-\ud7af\u4e00-\u9fff]/;
const VISIBLE_ATTRS = new Set([
  'placeholder',
  'title',
  'alt',
  'aria-label',
  'label',
  'aria-description',
  'aria-placeholder',
]);
/** Absolute paths of files changed in git (staged + unstaged + untracked). */
function changedFiles() {
  try {
    const out = execFileSync('git', ['diff', '--name-only', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return new Set(
      `${out}\n${untracked}`
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
    );
  } catch {
    return null; // not a git checkout — caller falls back to scanning everything
  }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function isTestFile(file) {
  return (
    /(^|[\\/])(__tests__|__mocks__|tests?|e2e)([\\/]|$)/.test(file) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)
  );
}

function positionOf(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: line + 1, column: character + 1 };
}

function looksUserVisible(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!/[\p{L}]/u.test(trimmed)) return false; // no letters at all → punctuation/number only
  // Technical example values: SKU / code / ID shapes such as "PSA-12345678",
  // "0x…", "USD", "12px", "item-42". These are not prose and are allowed.
  if (/^[\p{Lu}\d]+(?:[-_/.:][\p{Lu}\d]+)*$/u.test(trimmed)) return false;
  if (/^(?:\d+(?:\.\d+)?)(?:px|rem|em|%|s|ms)$/i.test(trimmed)) return false;
  return true;
}

// ---------------------------------------------------------------- check A
function scanHardcoded(relFiles) {
  const findings = [];
  for (const rel of relFiles) {
    const file = path.join(ROOT, rel);
    const ext = path.extname(file);
    if (!['.ts', '.tsx', '.jsx', '.js', '.mjs'].includes(ext)) continue;
    if (isTestFile(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ext === '.tsx' || ext === '.jsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const visit = node => {
      // JSX text: <Button>提交订单</Button>
      if (ts.isJsxText(node) && looksUserVisible(node.text)) {
        findings.push({
          file: rel,
          ...positionOf(sourceFile, node),
          kind: 'jsx-text',
          text: node.text.trim().slice(0, 60),
        });
      }
      // JSX attribute with a literal: placeholder="请输入"
      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const name = node.name.getText(sourceFile);
        if (VISIBLE_ATTRS.has(name) && looksUserVisible(node.initializer.text)) {
          findings.push({
            file: rel,
            ...positionOf(sourceFile, node),
            kind: `attr:${name}`,
            text: node.initializer.text.slice(0, 60),
          });
        }
      }
      // t('key', { defaultValue: '中文' })
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText(sourceFile) === 'defaultValue' &&
        ts.isStringLiteralLike(node.initializer) &&
        CJK_ANY.test(node.initializer.text)
      ) {
        findings.push({
          file: rel,
          ...positionOf(sourceFile, node),
          kind: 'defaultValue',
          text: node.initializer.text.slice(0, 60),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return findings;
}

// ---------------------------------------------------------------- locales
function localeObject(file) {
  const filePath = path.join(LOCALES_DIR, file);
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const name = path.basename(file, '.ts');
  let literal = null;
  const visit = node => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      literal = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!literal) throw new Error(`no exported locale object in ${file}`);
  return { literal, sourceFile, text };
}

function flatten(literal, prefix = '', out = new Map()) {
  for (const prop of literal.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const keyName = prop.name.getText().replace(/^['"]|['"]$/g, '');
    const fullKey = prefix ? `${prefix}.${keyName}` : keyName;
    if (ts.isObjectLiteralExpression(prop.initializer)) flatten(prop.initializer, fullKey, out);
    else if (
      ts.isStringLiteralLike(prop.initializer) ||
      ts.isNoSubstitutionTemplateLiteral(prop.initializer)
    ) {
      out.set(fullKey, { value: prop.initializer.text, node: prop.initializer });
    }
  }
  return out;
}

// ---------------------------------------------------------------- main
const changed = changedOnly ? changedFiles() : null;
const localeFindings = {}; // code -> [{key,value}]
const identical = {}; // code -> [{key,value}]
let enKeys = new Map();
let parityFindings = [];

for (const code of LOCALES) {
  const { literal, sourceFile } = localeObject(`${code}.ts`);
  const flat = flatten(literal);
  if (code === 'en') enKeys = flat;
  const bad = [];
  const same = [];
  for (const [key, entry] of flat) {
    const re = FORBIDDEN[code];
    if (re && re.test(entry.value)) bad.push({ key, value: entry.value.slice(0, 70) });
    if (code !== 'en') {
      const en = enKeys.get(key);
      if (en && en.value === entry.value && looksUserVisible(entry.value))
        same.push({ key, value: entry.value.slice(0, 70) });
    }
  }
  localeFindings[code] = bad;
  if (code !== 'en') identical[code] = same;
  void sourceFile;
}

for (const code of LOCALES) {
  if (code === 'en') continue;
  const { literal } = localeObject(`${code}.ts`);
  const flat = flatten(literal);
  for (const key of enKeys.keys())
    if (!flat.has(key)) parityFindings.push({ locale: code, kind: 'missing', key });
  for (const key of flat.keys())
    if (!enKeys.has(key)) parityFindings.push({ locale: code, kind: 'extra', key });
}

const codeFiles = SCAN_DIRS.flatMap(d =>
  walk(path.join(ROOT, d)).map(f => path.relative(ROOT, f).replace(/\\/g, '/'))
).filter(f => (changed ? changed.has(f) : true));
const hardcoded = scanHardcoded(codeFiles);

const wrongScript = Object.entries(localeFindings).flatMap(([locale, list]) =>
  list.map(item => ({ locale, ...item }))
);
const identicalTotal = Object.values(identical).reduce((n, list) => n + list.length, 0);

/**
 * Ratchet: the repository already carries a backlog of hardcoded strings. Rather
 * than blocking every PR until the backlog is paid off, we record the backlog once
 * (--write-baseline) and from then on only fail on *new* violations. Once the
 * backlog reaches zero the strict mode turns on identical-to-English as well.
 */
const fingerprint = f =>
  `${f.file ?? f.locale}|${f.line ?? ''}|${f.kind ?? ''}|${f.key ?? ''}|${f.text ?? ''}`;
const current = {
  hardcoded: hardcoded.map(fingerprint),
  wrongScript: wrongScript.map(fingerprint),
  parity: parityFindings.map(fingerprint),
};

let baseline = { hardcoded: [], wrongScript: [], parity: [], identical: {} };
if (writeBaseline) {
  baseline = {
    hardcoded: current.hardcoded,
    wrongScript: current.wrongScript,
    parity: current.parity,
    identical: Object.fromEntries(Object.entries(identical).map(([k, v]) => [k, v.length])),
    recordedAt: new Date().toISOString(),
  };
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
} else if (fs.existsSync(BASELINE_FILE)) {
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    /* unreadable baseline → treat as empty */
  }
}

const baselineSet = {
  hardcoded: new Set(baseline.hardcoded ?? []),
  wrongScript: new Set(baseline.wrongScript ?? []),
  parity: new Set(baseline.parity ?? []),
};
const newHardcoded = current.hardcoded.filter(f => !baselineSet.hardcoded.has(f));
const newWrongScript = current.wrongScript.filter(f => !baselineSet.wrongScript.has(f));
const newParity = current.parity.filter(f => !baselineSet.parity.has(f));
const blocking =
  newHardcoded.length + newWrongScript.length + newParity.length + (strict ? identicalTotal : 0);

const result = {
  mode: changedOnly ? 'changed' : 'all',
  strict,
  blocking,
  newHardcoded: newHardcoded.length,
  newWrongScript: newWrongScript.length,
  newParity: newParity.length,
  baselineRecorded: Object.fromEntries(
    Object.entries(baselineSet).map(([k, set]) => [k, set.size])
  ),
  hardcoded,
  wrongScript,
  parity: parityFindings,
  identicalToEnglish: Object.fromEntries(Object.entries(identical).map(([k, v]) => [k, v.length])),
  identicalSamples: Object.fromEntries(
    Object.entries(identical).map(([k, v]) => [k, v.slice(0, 4)])
  ),
  scannedCodeFiles: codeFiles.length,
};

if (reportPath) {
  const lines = [
    `# i18n check report (${result.mode}${strict ? ', strict' : ''})`,
    '',
    `Blocking violations: **${blocking}**`,
    '',
    `## A. hardcoded user-visible text — ${hardcoded.length}`,
    ...hardcoded.map(
      f => `- \`${f.file}:${f.line}:${f.column}\` [${f.kind}] ${JSON.stringify(f.text)}`
    ),
    '',
    `## B. wrong-script text in locale files — ${wrongScript.length}`,
    ...wrongScript.map(f => `- ${f.locale} → \`${f.key}\`: ${JSON.stringify(f.value)}`),
    '',
    `## E. locale key parity vs en — ${parityFindings.length}`,
    ...parityFindings.slice(0, 50).map(f => `- ${f.locale} ${f.kind} \`${f.key}\``),
    '',
    `## D. non-English values still identical to English — ${identicalTotal} (blocking only with --strict)`,
    ...Object.entries(identical).map(([code, list]) => `- ${code}: ${list.length}`),
  ];
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join('\n') + '\n', 'utf8');
}

if (asJson) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} else {
  console.log(
    `i18n check (${result.mode}${strict ? ', strict' : ''}) — scanned ${codeFiles.length} source files`
  );
  console.log(
    `  A hardcoded user-visible text : ${hardcoded.length} (new: ${newHardcoded.length})`
  );
  console.log(
    `  B wrong-script locale values  : ${wrongScript.length} (new: ${newWrongScript.length})`
  );
  console.log(
    `  E locale key parity vs en     : ${parityFindings.length} (new: ${newParity.length})`
  );
  console.log(
    `  D identical to English        : ${identicalTotal}${strict ? ' (blocking)' : ' (report only)'}`
  );
  console.log(
    `  backlog in baseline           : ${Object.values(result.baselineRecorded).join(' / ')}`
  );
  for (const f of hardcoded.slice(0, 15))
    console.log(`      ${f.file}:${f.line} [${f.kind}] ${f.text}`);
  for (const f of wrongScript.slice(0, 10))
    console.log(`      ${f.locale}.ts ${f.key}: ${f.value}`);
  if (blocking > 0) console.log(`\n❌ ${blocking} blocking i18n violation(s).`);
  else console.log('\n✅ no blocking i18n violations.');
}

process.exit(blocking > 0 ? 1 : 0);
