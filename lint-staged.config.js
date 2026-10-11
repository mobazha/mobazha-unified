module.exports = {
  // TypeScript and JavaScript sources, including ESM and CommonJS config files.
  '*.{ts,tsx,js,jsx,mjs,cjs}': [
    'eslint --fix',
    'prettier --write',
    // Blocks newly introduced mixed-language defects (hardcoded user-visible
    // text, wrong-script locale values, non-English t() defaults, key drift).
    // Existing debt is recorded in scripts/.i18n-baseline.json, so only new
    // violations fail the commit.
    () => 'node scripts/check-i18n.mjs --changed',
  ],

  // Stylesheets
  '*.{css,scss}': ['prettier --write'],

  // Project metadata and documentation
  '*.{json,yaml,yml,md}': ['prettier --write'],
};
