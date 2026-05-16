import fs from 'fs';
import path from 'path';
import https from 'https';

const base = path.resolve('packages/core/i18n/locales');
const locales = [
  { file: 'ja.ts', code: 'ja' },
  { file: 'ko.ts', code: 'ko' },
  { file: 'es.ts', code: 'es' },
  { file: 'fr.ts', code: 'fr' },
  { file: 'de.ts', code: 'de' },
  { file: 'ru.ts', code: 'ru' },
  { file: 'pt.ts', code: 'pt' },
];

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

function extractEntries(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      extractEntries(v, key, out);
    } else {
      out.set(key, v);
    }
  }
  return out;
}

function setNestedValue(obj, key, value) {
  const parts = key.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function escapeString(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/'/g, "\\'");
}

function formatObjectKey(key) {
  if (/^[$A-Z_a-z][$\w]*$/u.test(key)) {
    return key;
  }
  return `'${escapeString(key)}'`;
}

function formatValue(value, indent) {
  if (typeof value === 'string') {
    return `'${escapeString(value)}'`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(item => `${' '.repeat(indent + 2)}${formatValue(item, indent + 2)}`);
    return `[\n${items.join(',\n')}\n${' '.repeat(indent)}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const lines = entries.map(([k, v]) => {
      return `${' '.repeat(indent + 2)}${formatObjectKey(k)}: ${formatValue(v, indent + 2)}`;
    });
    return `{\n${lines.join(',\n')}\n${' '.repeat(indent)}}`;
  }

  return JSON.stringify(value);
}

function serializeLocale(file, obj) {
  const localeName = path.basename(file, '.ts');
  const title = {
    ja: 'Japanese',
    ko: 'Korean',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ru: 'Russian',
    pt: 'Portuguese',
  }[localeName];

  return `/**\n * ${title} Translations\n */\n\nimport type { PartialTranslationResource } from '../types';\n\nexport const ${localeName}: PartialTranslationResource = ${formatValue(obj, 0)};\n\nexport default ${localeName};\n`;
}

const PLACEHOLDER_RE = /(\{\{[^}]+\}\}|\{[a-zA-Z0-9_]+\}|https?:\/\/\S+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const cache = new Map();

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function maskText(text) {
  const tokens = [];
  const masked = text.replace(PLACEHOLDER_RE, match => {
    const token = `__PH_${tokens.length}__`;
    tokens.push(match);
    return token;
  });
  return { masked, tokens };
}

function unmaskText(text, tokens) {
  return text.replace(/__PH_(\d+)__/g, (_, index) => tokens[Number(index)] ?? '');
}

async function translateText(text, target, attempt = 0) {
  const cacheKey = `${target}::${text}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const { masked, tokens } = maskText(text);
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&dt=t&tl=' +
    encodeURIComponent(target) +
    '&q=' +
    encodeURIComponent(masked);

  try {
    const translated = await new Promise((resolve, reject) => {
      https
        .get(
          url,
          {
            headers: {
              'user-agent': 'Mozilla/5.0',
              accept: 'application/json,text/plain,*/*',
            },
          },
          res => {
            let body = '';
            res.on('data', chunk => {
              body += chunk;
            });
            res.on('end', () => {
              if (body.trim().startsWith('<')) {
                reject(new Error(`HTML response for ${target}`));
                return;
              }

              try {
                const payload = JSON.parse(body);
                resolve(payload?.[0]?.map(part => part[0]).join('') ?? masked);
              } catch (error) {
                reject(new Error(`Failed to parse translation response for ${target}: ${error}`));
              }
            });
          }
        )
        .on('error', reject);
    });

    const result = unmaskText(translated, tokens);
    cache.set(cacheKey, result);
    await sleep(120);
    return result;
  } catch (error) {
    if (attempt < 5) {
      await sleep(1000 * 2 ** attempt);
      return translateText(text, target, attempt + 1);
    }
    throw error;
  }
}

async function runWithConcurrency(items, limit, worker) {
  const queue = [...items];
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const targetFilter = process.env.LOCALES
    ? new Set(
        process.env.LOCALES.split(',')
          .map(value => value.trim())
          .filter(Boolean)
      )
    : null;
  const en = compileObjectLiteral('en.ts');
  const enEntries = extractEntries(en);

  for (const locale of locales) {
    if (targetFilter && !targetFilter.has(path.basename(locale.file, '.ts'))) {
      continue;
    }
    const filePath = path.join(base, locale.file);
    const current = compileObjectLiteral(locale.file);
    const currentEntries = extractEntries(current);
    const missingKeys = [...enEntries.keys()].filter(key => !currentEntries.has(key));

    console.log(`${locale.file}: filling ${missingKeys.length} keys`);

    await runWithConcurrency(missingKeys, 1, async key => {
      const source = enEntries.get(key);
      if (typeof source !== 'string') {
        setNestedValue(current, key, source);
        return;
      }
      const translated = await translateText(source, locale.code);
      setNestedValue(current, key, translated);
    });

    fs.writeFileSync(filePath, serializeLocale(locale.file, current));
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
