module.exports = {
  // TypeScript and JavaScript sources, including ESM and CommonJS config files.
  '*.{ts,tsx,js,jsx,mjs,cjs}': ['eslint --fix', 'prettier --write'],

  // Stylesheets
  '*.{css,scss}': ['prettier --write'],

  // Project metadata and documentation
  '*.{json,yaml,yml,md}': ['prettier --write'],
};
