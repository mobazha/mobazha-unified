import fs from 'fs';
import path from 'path';

const base = path.resolve('packages/core/i18n/locales');
const files = ['en.ts', 'zh.ts', 'ja.ts', 'ko.ts', 'es.ts', 'fr.ts', 'de.ts', 'ru.ts', 'pt.ts'];

function compileObjectLiteral(file) {
  let src = fs.readFileSync(path.join(base, file), 'utf8');
  src = src.replace(/^import .*$/gm, '');
  src = src.replace(/export default\s+\w+;?\s*$/gm, '');
  src = src.replace(/export const\s+\w+\s*:\s*[^=]+=/, 'module.exports =');
  src = src.replace(/export const\s+\w+\s*=/, 'module.exports =');
  const mod = { exports: {} };
  new Function('module', 'exports', src)(mod, mod.exports);
  return mod.exports;
}

function extract(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...extract(v, key));
    else out.push(key);
  }
  return out;
}

const en = compileObjectLiteral('en.ts');
const enKeys = extract(en);

for (const file of files.slice(1)) {
  const locale = compileObjectLiteral(file);
  const keys = new Set(extract(locale));
  const missing = enKeys.filter(key => !keys.has(key));
  console.log(`${file}: ${missing.length}`);
  for (const key of missing) {
    console.log(`  - ${key}`);
  }
}
