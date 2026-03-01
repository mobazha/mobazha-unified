/**
 * next/font/google Vite compat layer
 *
 * In Next.js, next/font/google optimizes fonts at build time.
 * In Vite dev mode, we load fonts via Google Fonts CDN and return
 * compatible objects with className, variable, and style properties.
 */

interface FontConfig {
  subsets?: string[];
  weight?: string[];
  variable?: string;
  display?: string;
}

interface FontResult {
  className: string;
  variable: string;
  style: { fontFamily: string };
}

const loadedFamilies = new Set<string>();

function loadGoogleFont(family: string, weights?: string[]) {
  if (typeof document === 'undefined') return;
  if (loadedFamilies.has(family)) return;
  loadedFamilies.add(family);

  const w = weights?.length ? `:wght@${weights.join(';')}` : '';
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}${w}&display=swap`;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

function createFontFactory(family: string, fallback = 'sans-serif') {
  return function fontFactory(config: FontConfig = {}): FontResult {
    loadGoogleFont(family, config.weight);
    const varName = config.variable || `--font-${family.toLowerCase().replace(/ /g, '-')}`;
    const cssClass = `font-${family.toLowerCase().replace(/ /g, '-')}`;

    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(varName, `'${family}', ${fallback}`);
    }

    return {
      className: cssClass,
      variable: varName,
      style: { fontFamily: `'${family}', ${fallback}` },
    };
  };
}

export const Inter = createFontFactory('Inter');
export const DM_Sans = createFontFactory('DM Sans');
export const Space_Grotesk = createFontFactory('Space Grotesk');
export const Playfair_Display = createFontFactory('Playfair Display', 'serif');
export const Lora = createFontFactory('Lora', 'serif');
export const Merriweather = createFontFactory('Merriweather', 'serif');
export const Josefin_Sans = createFontFactory('Josefin Sans');
export const Poppins = createFontFactory('Poppins');

export default Inter;
