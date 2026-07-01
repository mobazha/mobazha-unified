import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const base = path.resolve('packages/core/i18n/locales');
const files = ['en.ts', 'zh.ts', 'ja.ts', 'ko.ts', 'es.ts', 'fr.ts', 'de.ts', 'ru.ts', 'pt.ts'];

function getObjectLiteralFromFile(file) {
  const filePath = path.join(base, file);
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  let objectLiteral = null;

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === path.basename(file, '.ts') &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      objectLiteral = node.initializer;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!objectLiteral) {
    throw new Error(`Could not find exported locale object in ${file}`);
  }

  return objectLiteral;
}

function getPropertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  if (ts.isComputedPropertyName(name)) {
    if (ts.isStringLiteral(name.expression) || ts.isNumericLiteral(name.expression)) {
      return name.expression.text;
    }
  }

  throw new Error(`Unsupported property name kind: ${name.kind}`);
}

function extract(node, prefix = '', out = []) {
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) {
      continue;
    }

    const key = getPropertyNameText(prop.name);
    const pathKey = prefix ? `${prefix}.${key}` : key;
    const initializer = ts.isShorthandPropertyAssignment(prop) ? prop.name : prop.initializer;

    if (ts.isObjectLiteralExpression(initializer)) {
      extract(initializer, pathKey, out);
    } else {
      out.push(pathKey);
    }
  }

  return out;
}

const enKeys = extract(getObjectLiteralFromFile('en.ts'));

for (const file of files.slice(1)) {
  const keys = new Set(extract(getObjectLiteralFromFile(file)));
  const missing = enKeys.filter(key => !keys.has(key));
  console.log(`${file}: ${missing.length}`);
  for (const key of missing) {
    console.log(`  - ${key}`);
  }
}
