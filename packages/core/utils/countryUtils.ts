/**
 * 国家名称国际化工具
 * 使用 i18n-iso-countries 库提供多语言国家名称支持
 */

import countries from 'i18n-iso-countries';

// 注册支持的语言 - 按需动态加载
const registeredLocales = new Set<string>();

/**
 * 注册语言包
 * 支持按需加载，避免打包所有语言
 */
async function registerLocale(locale: string): Promise<void> {
  if (registeredLocales.has(locale)) return;

  try {
    // 动态导入语言包
    const localeData = await import(`i18n-iso-countries/langs/${locale}.json`);
    countries.registerLocale(localeData.default || localeData);
    registeredLocales.add(locale);
  } catch {
    // 如果语言包不存在，尝试加载基础语言（如 zh-CN -> zh）
    const baseLocale = locale.split('-')[0];
    if (baseLocale !== locale && !registeredLocales.has(baseLocale)) {
      try {
        const localeData = await import(`i18n-iso-countries/langs/${baseLocale}.json`);
        countries.registerLocale(localeData.default || localeData);
        registeredLocales.add(baseLocale);
        registeredLocales.add(locale); // 标记原始 locale 也已处理
      } catch {
        console.warn(`Country locale not found: ${locale}`);
      }
    }
  }
}

/**
 * 同步注册常用语言包（用于初始化）
 */
export function initCountryLocales(): void {
  // 预加载常用语言
  import('i18n-iso-countries/langs/en.json').then(data => {
    countries.registerLocale(data.default || data);
    registeredLocales.add('en');
  });
  import('i18n-iso-countries/langs/zh.json').then(data => {
    countries.registerLocale(data.default || data);
    registeredLocales.add('zh');
    registeredLocales.add('zh-CN');
    registeredLocales.add('zh-TW');
  });
}

/**
 * 国家名称（下划线格式）到 ISO 代码的映射
 * 用于处理 API 返回的下划线格式国家名称
 */
/**
 * 完整的国家名称（下划线格式）到 ISO 代码的映射
 * 与后端 countrycodes.proto 保持同步
 */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  // A
  AFGHANISTAN: 'AF',
  ALAND_ISLANDS: 'AX',
  ALBANIA: 'AL',
  ALGERIA: 'DZ',
  AMERICAN_SAMOA: 'AS',
  ANDORRA: 'AD',
  ANGOLA: 'AO',
  ANGUILLA: 'AI',
  ANTIGUA: 'AG',
  ANTIGUA_AND_BARBUDA: 'AG',
  ARGENTINA: 'AR',
  ARMENIA: 'AM',
  ARUBA: 'AW',
  AUSTRALIA: 'AU',
  AUSTRIA: 'AT',
  AZERBAIJAN: 'AZ',
  // B
  BAHAMAS: 'BS',
  BAHRAIN: 'BH',
  BANGLADESH: 'BD',
  BARBADOS: 'BB',
  BELARUS: 'BY',
  BELGIUM: 'BE',
  BELIZE: 'BZ',
  BENIN: 'BJ',
  BERMUDA: 'BM',
  BHUTAN: 'BT',
  BOLIVIA: 'BO',
  BONAIRE_SINT_EUSTATIUS_SABA: 'BQ',
  BOSNIA: 'BA',
  BOSNIA_AND_HERZEGOVINA: 'BA',
  BOTSWANA: 'BW',
  BOUVET_ISLAND: 'BV',
  BRAZIL: 'BR',
  BRITISH_INDIAN_OCEAN_TERRITORY: 'IO',
  BRUNEI: 'BN',
  BRUNEI_DARUSSALAM: 'BN',
  BULGARIA: 'BG',
  BURKINA_FASO: 'BF',
  BURUNDI: 'BI',
  // C
  CABO_VERDE: 'CV',
  CAPE_VERDE: 'CV',
  CAMBODIA: 'KH',
  CAMEROON: 'CM',
  CANADA: 'CA',
  CAYMAN_ISLANDS: 'KY',
  CENTRAL_AFRICAN_REPUBLIC: 'CF',
  CHAD: 'TD',
  CHILE: 'CL',
  CHINA: 'CN',
  CHRISTMAS_ISLAND: 'CX',
  COCOS_ISLANDS: 'CC',
  COLOMBIA: 'CO',
  COMOROS: 'KM',
  CONGO: 'CG',
  CONGO_REPUBLIC: 'CG',
  COOK_ISLANDS: 'CK',
  COSTA_RICA: 'CR',
  COTE_DIVOIRE: 'CI',
  IVORY_COAST: 'CI',
  CROATIA: 'HR',
  CUBA: 'CU',
  CURACAO: 'CW',
  CYPRUS: 'CY',
  CZECH_REPUBLIC: 'CZ',
  CZECHIA: 'CZ',
  // D
  DENMARK: 'DK',
  DJIBOUTI: 'DJ',
  DOMINICA: 'DM',
  DOMINICAN_REPUBLIC: 'DO',
  // E
  ECUADOR: 'EC',
  EGYPT: 'EG',
  EL_SALVADOR: 'SV',
  EQUATORIAL_GUINEA: 'GQ',
  ERITREA: 'ER',
  ESTONIA: 'EE',
  ETHIOPIA: 'ET',
  ESWATINI: 'SZ',
  SWAZILAND: 'SZ',
  // F
  FALKLAND_ISLANDS: 'FK',
  FAROE_ISLANDS: 'FO',
  FIJI: 'FJ',
  FINLAND: 'FI',
  FRANCE: 'FR',
  FRENCH_GUIANA: 'GF',
  FRENCH_POLYNESIA: 'PF',
  FRENCH_SOUTHERN_TERRITORIES: 'TF',
  // G
  GABON: 'GA',
  GAMBIA: 'GM',
  GEORGIA: 'GE',
  GERMANY: 'DE',
  GHANA: 'GH',
  GIBRALTAR: 'GI',
  GREECE: 'GR',
  GREENLAND: 'GL',
  GRENADA: 'GD',
  GUADELOUPE: 'GP',
  GUAM: 'GU',
  GUATEMALA: 'GT',
  GUERNSEY: 'GG',
  GUINEA: 'GN',
  GUINEA_BISSAU: 'GW',
  GUYANA: 'GY',
  // H
  HAITI: 'HT',
  HEARD_ISLAND: 'HM',
  HOLY_SEE: 'VA',
  VATICAN: 'VA',
  HONDURAS: 'HN',
  HONG_KONG: 'HK',
  HUNGARY: 'HU',
  // I
  ICELAND: 'IS',
  INDIA: 'IN',
  INDONESIA: 'ID',
  IRAN: 'IR',
  IRAQ: 'IQ',
  IRELAND: 'IE',
  ISLE_OF_MAN: 'IM',
  ISRAEL: 'IL',
  ITALY: 'IT',
  // J
  JAMAICA: 'JM',
  JAPAN: 'JP',
  JERSEY: 'JE',
  JORDAN: 'JO',
  // K
  KAZAKHSTAN: 'KZ',
  KENYA: 'KE',
  KIRIBATI: 'KI',
  KOREA: 'KR',
  NORTH_KOREA: 'KP',
  SOUTH_KOREA: 'KR',
  KUWAIT: 'KW',
  KYRGYZSTAN: 'KG',
  // L
  LAO: 'LA',
  LAOS: 'LA',
  LATVIA: 'LV',
  LEBANON: 'LB',
  LESOTHO: 'LS',
  LIBERIA: 'LR',
  LIBYA: 'LY',
  LIECHTENSTEIN: 'LI',
  LITHUANIA: 'LT',
  LUXEMBOURG: 'LU',
  // M
  MACAO: 'MO',
  MACAU: 'MO',
  MACEDONIA: 'MK',
  NORTH_MACEDONIA: 'MK',
  MADAGASCAR: 'MG',
  MALAWI: 'MW',
  MALAYSIA: 'MY',
  MALDIVES: 'MV',
  MALI: 'ML',
  MALTA: 'MT',
  MARSHALL_ISLANDS: 'MH',
  MARTINIQUE: 'MQ',
  MAURITANIA: 'MR',
  MAURITIUS: 'MU',
  MAYOTTE: 'YT',
  MEXICO: 'MX',
  MICRONESIA: 'FM',
  MOLDOVA: 'MD',
  MONACO: 'MC',
  MONGOLIA: 'MN',
  MONTENEGRO: 'ME',
  MONTSERRAT: 'MS',
  MOROCCO: 'MA',
  MOZAMBIQUE: 'MZ',
  MYANMAR: 'MM',
  BURMA: 'MM',
  // N
  NAMIBIA: 'NA',
  NAURU: 'NR',
  NEPAL: 'NP',
  NETHERLANDS: 'NL',
  NEW_CALEDONIA: 'NC',
  NEW_ZEALAND: 'NZ',
  NICARAGUA: 'NI',
  NIGER: 'NE',
  NIGERIA: 'NG',
  NIUE: 'NU',
  NORFOLK_ISLAND: 'NF',
  NORTHERN_MARIANA_ISLANDS: 'MP',
  NORWAY: 'NO',
  // O
  OMAN: 'OM',
  // P
  PAKISTAN: 'PK',
  PALAU: 'PW',
  PALESTINE: 'PS',
  PANAMA: 'PA',
  PAPUA_NEW_GUINEA: 'PG',
  PARAGUAY: 'PY',
  PERU: 'PE',
  PHILIPPINES: 'PH',
  PITCAIRN: 'PN',
  POLAND: 'PL',
  PORTUGAL: 'PT',
  PUERTO_RICO: 'PR',
  // Q
  QATAR: 'QA',
  // R
  REUNION: 'RE',
  ROMANIA: 'RO',
  RUSSIA: 'RU',
  RWANDA: 'RW',
  // S
  SAINT_BARTHELEMY: 'BL',
  SAINT_HELENA: 'SH',
  SAINT_KITTS: 'KN',
  SAINT_LUCIA: 'LC',
  SAINT_MARTIN: 'MF',
  SAINT_PIERRE: 'PM',
  SAINT_VINCENT: 'VC',
  SAMOA: 'WS',
  SAN_MARINO: 'SM',
  SAO_TOME: 'ST',
  SAUDI_ARABIA: 'SA',
  SENEGAL: 'SN',
  SERBIA: 'RS',
  SEYCHELLES: 'SC',
  SIERRA_LEONE: 'SL',
  SINGAPORE: 'SG',
  SINT_MAARTEN: 'SX',
  SUCRE: 'SK', // Note: This might be Slovakia based on proto position
  SLOVAKIA: 'SK',
  SLOVENIA: 'SI',
  SOLOMON_ISLANDS: 'SB',
  SOMALIA: 'SO',
  SOUTH_AFRICA: 'ZA',
  SOUTH_SUDAN: 'SS',
  SPAIN: 'ES',
  SRI_LANKA: 'LK',
  SUDAN: 'SD',
  SURINAME: 'SR',
  SVALBARD: 'SJ',
  SWEDEN: 'SE',
  SWITZERLAND: 'CH',
  SYRIA: 'SY',
  SYRIAN_ARAB_REPUBLIC: 'SY',
  // T
  TAIWAN: 'TW',
  TAJIKISTAN: 'TJ',
  TANZANIA: 'TZ',
  THAILAND: 'TH',
  TIMOR_LESTE: 'TL',
  TOGO: 'TG',
  TOKELAU: 'TK',
  TONGA: 'TO',
  TRINIDAD: 'TT',
  TRINIDAD_AND_TOBAGO: 'TT',
  TUNISIA: 'TN',
  TURKEY: 'TR',
  TURKMENISTAN: 'TM',
  TURKS_AND_CAICOS_ISLANDS: 'TC',
  TUVALU: 'TV',
  // U
  UGANDA: 'UG',
  UKRAINE: 'UA',
  UAE: 'AE',
  UNITED_ARAB_EMIRATES: 'AE',
  UNITED_KINGDOM: 'GB',
  UNITED_STATES: 'US',
  UNITED_STATES_MINOR_ISLANDS: 'UM',
  URUGUAY: 'UY',
  UZBEKISTAN: 'UZ',
  // V
  VANUATU: 'VU',
  VENEZUELA: 'VE',
  VIETNAM: 'VN',
  VIRGIN_ISLANDS_BRITISH: 'VG',
  VIRGIN_ISLANDS_US: 'VI',
  // W
  WALLIS_AND_FUTUNA: 'WF',
  WESTERN_SAHARA: 'EH',
  // Y
  YEMEN: 'YE',
  // Z
  ZAMBIA: 'ZM',
  ZIMBABWE: 'ZW',
};

/**
 * 将国家标识转换为 ISO 代码
 * 支持多种格式：ISO 代码、下划线格式名称等
 */
export function toISOCountryCode(countryIdentifier: string): string {
  // 已经是 ISO 代码（2位字母）
  if (/^[A-Z]{2}$/.test(countryIdentifier)) {
    return countryIdentifier;
  }

  // 尝试从映射表获取
  const upperCode = countryIdentifier.toUpperCase();
  if (COUNTRY_NAME_TO_ISO[upperCode]) {
    return COUNTRY_NAME_TO_ISO[upperCode];
  }

  // 返回原始值（可能是未知格式）
  return countryIdentifier;
}

/**
 * 获取国家名称（本地化）
 *
 * @param countryCode 国家标识，支持 ISO 代码或下划线格式名称
 * @param locale 语言代码 (如 'en', 'zh')
 * @returns 本地化的国家名称，如果找不到则返回格式化后的名称
 *
 * @example
 * getCountryName('US', 'zh') // '美国'
 * getCountryName('UNITED_STATES', 'zh') // '美国'
 * getCountryName('CN', 'en') // 'China'
 * getCountryName('ALL', 'en') // 'Worldwide'
 */
export function getCountryName(countryCode: string, locale: string = 'en'): string {
  // 特殊处理：全球/所有地区
  if (countryCode === 'ALL' || countryCode === 'WORLDWIDE') {
    return locale.startsWith('zh') ? '全球' : 'Worldwide';
  }

  // 转换为 ISO 代码
  const isoCode = toISOCountryCode(countryCode);

  // 尝试获取本地化名称
  const normalizedLocale = locale.split('-')[0]; // zh-CN -> zh
  let name = countries.getName(isoCode, normalizedLocale);

  // 如果找不到，回退到英文
  if (!name && normalizedLocale !== 'en') {
    name = countries.getName(isoCode, 'en');
  }

  // 如果还是找不到，格式化原始代码为可读名称
  if (!name) {
    // 将 UNITED_STATES 转换为 United States
    name = countryCode
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return name;
}

/**
 * 批量获取国家名称
 *
 * @param countryCodes 国家代码数组
 * @param locale 语言代码
 * @returns 国家代码到名称的映射
 */
export function getCountryNames(
  countryCodes: string[],
  locale: string = 'en'
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const code of countryCodes) {
    result[code] = getCountryName(code, locale);
  }
  return result;
}

/**
 * 格式化配送区域列表为显示文本
 *
 * @param regions 配送区域代码数组
 * @param locale 语言代码
 * @param maxDisplay 最多显示几个国家，超过后显示 "+N"
 * @returns 格式化后的区域文本
 *
 * @example
 * formatShippingRegions(['US', 'CA', 'MX'], 'zh') // '美国、加拿大、墨西哥'
 * formatShippingRegions(['US', 'CA', 'MX', 'UK', 'DE'], 'en', 3) // 'United States, Canada, Mexico +2'
 */
export function formatShippingRegions(
  regions: string[],
  locale: string = 'en',
  maxDisplay: number = 5
): string {
  if (!regions || regions.length === 0) {
    return locale.startsWith('zh') ? '未指定' : 'Not specified';
  }

  // 全球配送
  if (regions.includes('ALL') || regions.includes('WORLDWIDE')) {
    return locale.startsWith('zh') ? '全球配送' : 'Worldwide Shipping';
  }

  const names = regions.slice(0, maxDisplay).map(code => getCountryName(code, locale));
  const separator = locale.startsWith('zh') ? '、' : ', ';
  let result = names.join(separator);

  // 如果超过最大显示数量
  if (regions.length > maxDisplay) {
    const remaining = regions.length - maxDisplay;
    result += ` +${remaining}`;
  }

  return result;
}

/**
 * 确保语言包已加载
 * 在需要使用国家名称之前调用
 */
export async function ensureCountryLocale(locale: string): Promise<void> {
  const normalizedLocale = locale.split('-')[0];
  if (!registeredLocales.has(normalizedLocale)) {
    await registerLocale(normalizedLocale);
  }
}

/**
 * 获取所有国家列表（用于选择器）
 *
 * @param locale 语言代码
 * @returns 国家列表 [{ code, name }]
 */
export function getAllCountries(locale: string = 'en'): Array<{ code: string; name: string }> {
  const normalizedLocale = locale.split('-')[0];
  const countryNames = countries.getNames(normalizedLocale) || countries.getNames('en');

  return Object.entries(countryNames)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

// 导出 countries 实例供高级用法
export { countries };
