module.exports = {
  // TypeScript/JavaScript 文件
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],

  // 样式文件
  '*.{css,scss}': ['prettier --write'],

  // JSON/YAML/Markdown
  '*.{json,yaml,yml,md}': ['prettier --write'],
};
