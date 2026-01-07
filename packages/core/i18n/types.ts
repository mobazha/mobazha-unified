/**
 * 国际化类型定义
 */

// 支持的语言
export type Locale = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru' | 'pt';

// 默认语言
export const DEFAULT_LOCALE: Locale = 'en';

// 支持的语言列表
export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt'];

// 语言信息
export const LOCALE_INFO: Record<Locale, { name: string; nativeName: string; flag: string }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
};

// 翻译键类型 - 使用点号分隔的路径
export type TranslationKey = string;

// 翻译参数
export type TranslationParams = Record<string, string | number>;

// 翻译函数类型
export type TranslateFunction = (key: TranslationKey, params?: TranslationParams) => string;

// 翻译资源结构
export interface TranslationResource {
  // 通用
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    search: string;
    filter: string;
    sort: string;
    all: string;
    none: string;
    more: string;
    less: string;
    yes: string;
    no: string;
    ok: string;
    close: string;
    retry: string;
    refresh: string;
    submit: string;
    reset: string;
    clear: string;
    copy: string;
    copied: string;
    share: string;
    download: string;
    upload: string;
    view: string;
    viewAll: string;
    seeMore: string;
    showMore: string;
    showLess: string;
  };

  // 导航
  nav: {
    home: string;
    search: string;
    messages: string;
    orders: string;
    profile: string;
    settings: string;
    wallet: string;
    cart: string;
    notifications: string;
  };

  // 首页
  home: {
    welcome: string;
    featured: string;
    trending: string;
    newArrivals: string;
    categories: string;
    viewAll: string;
  };

  // 商品
  product: {
    title: string;
    description: string;
    price: string;
    quantity: string;
    stock: string;
    inStock: string;
    outOfStock: string;
    category: string;
    condition: string;
    shipping: string;
    freeShipping: string;
    returns: string;
    seller: string;
    reviews: string;
    rating: string;
    addToCart: string;
    buyNow: string;
    share: string;
    report: string;
    options: string;
    selectOption: string;
    variants: string;
  };

  // 搜索
  search: {
    placeholder: string;
    results: string;
    noResults: string;
    filters: string;
    sortBy: string;
    relevance: string;
    priceLowHigh: string;
    priceHighLow: string;
    newest: string;
    bestRating: string;
    listings: string;
    users: string;
  };

  // 购物车
  cart: {
    title: string;
    empty: string;
    emptyMessage: string;
    continueShopping: string;
    subtotal: string;
    shipping: string;
    total: string;
    checkout: string;
    remove: string;
    quantity: string;
    itemCount: string;
    itemsInCart: string;
    selectAll: string;
    deselectAll: string;
    orderSummary: string;
    proceedToCheckout: string;
    free: string;
    acceptedPayments: string;
    startShopping: string;
  };

  // 结账
  checkout: {
    title: string;
    shippingAddress: string;
    paymentMethod: string;
    orderSummary: string;
    placeOrder: string;
    processing: string;
    selectCrypto: string;
    paymentAddress: string;
    scanQR: string;
    copyAddress: string;
    amountToPay: string;
    waitingPayment: string;
    paymentConfirmed: string;
  };

  // 订单
  order: {
    title: string;
    myOrders: string;
    orderNumber: string;
    status: string;
    date: string;
    total: string;
    items: string;
    details: string;
    tracking: string;
    pending: string;
    confirmed: string;
    shipped: string;
    delivered: string;
    completed: string;
    cancelled: string;
    refunded: string;
    disputed: string;
    purchases: string;
    sales: string;
    myPurchases: string;
    mySales: string;
    allOrders: string;
    processing: string;
    manageOrders: string;
    noOrdersFound: string;
    noOrdersMessage: string;
    noStatusOrders: string;
  };

  // 聊天
  chat: {
    title: string;
    conversations: string;
    newMessage: string;
    typeMessage: string;
    send: string;
    noMessages: string;
    online: string;
    offline: string;
    lastSeen: string;
    typing: string;
    encrypted: string;
    welcomeToMessages: string;
    selectConversation: string;
    searchConversations: string;
  };

  // 钱包
  wallet: {
    title: string;
    balance: string;
    send: string;
    receive: string;
    transactions: string;
    address: string;
    amount: string;
    fee: string;
    memo: string;
    confirm: string;
    history: string;
    noTransactions: string;
    sent: string;
    received: string;
    pending: string;
    totalPortfolioValue: string;
    exchange: string;
    yourWallets: string;
    transactionHistory: string;
    clear: string;
    all: string;
  };

  // 用户资料
  profile: {
    title: string;
    myProfile: string;
    editProfile: string;
    about: string;
    location: string;
    joined: string;
    followers: string;
    following: string;
    listings: string;
    reviews: string;
    verified: string;
    store: string;
    viewStore: string;
    follow: string;
    unfollow: string;
    message: string;
    block: string;
    report: string;
    myStore: string;
    addNewListing: string;
    contactInformation: string;
    email: string;
    phone: string;
    website: string;
    profileInformation: string;
    name: string;
    bio: string;
    saveChanges: string;
  };

  // 设置
  settings: {
    title: string;
    general: string;
    account: string;
    notifications: string;
    privacy: string;
    security: string;
    language: string;
    currency: string;
    theme: string;
    darkMode: string;
    lightMode: string;
    system: string;
    logout: string;
    deleteAccount: string;
    backup: string;
    restore: string;
    about: string;
    version: string;
    termsOfService: string;
    privacyPolicy: string;
    appearance: string;
    chooseTheme: string;
    displayMode: string;
  };

  // 主题
  theme: {
    classic: string;
    classicDesc: string;
    crypto: string;
    cryptoDesc: string;
    business: string;
    businessDesc: string;
    cyberpunk: string;
    cyberpunkDesc: string;
    nature: string;
    natureDesc: string;
    luxury: string;
    luxuryDesc: string;
  };

  // 错误消息
  errors: {
    generic: string;
    network: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    serverError: string;
    timeout: string;
    offline: string;
    invalidInput: string;
    requiredField: string;
  };

  // 时间相关
  time: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    weeksAgo: string;
    monthsAgo: string;
    yearsAgo: string;
  };

  // Hero 区域
  hero: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    exploreMarket: string;
    startSelling: string;
    activeStores: string;
    productsListed: string;
    platformFee: string;
  };

  // 页脚
  footer: {
    tagline: string;
    marketplace: string;
    browseProducts: string;
    categories: string;
    findModerators: string;
    startSelling: string;
    resources: string;
    gettingStarted: string;
    documentation: string;
    api: string;
    faq: string;
    company: string;
    about: string;
    blog: string;
    careers: string;
    contact: string;
    allRightsReserved: string;
  };

  // 市场/分类
  marketplace: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    featured: string;
    featuredMarketplaces: string;
    allMarketplaces: string;
    searchResults: string;
    createMarketplace: string;
    members: string;
    sellers: string;
    products: string;
    noMarketplacesFound: string;
    clearFilters: string;
    sortByMembers: string;
    sortByProducts: string;
    sortByName: string;
    allCategories: string;
  };

  // 调解员
  moderator: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    language: string;
    allLanguages: string;
    maxFee: string;
    anyFee: string;
    verifiedOnly: string;
    sortBy: string;
    highestRating: string;
    lowestFee: string;
    mostDisputes: string;
    resetFilters: string;
    moderatorsFound: string;
    disputesHandled: string;
    success: string;
    fee: string;
    noModeratorsFound: string;
  };

  // 筛选器
  filter: {
    filters: string;
    category: string;
    priceRange: string;
    min: string;
    max: string;
    rating: string;
    anyRating: string;
    stars: string;
    type: string;
    allTypes: string;
    physicalGoods: string;
    digitalGoods: string;
    services: string;
    rwaTokens: string;
  };

  // 空状态
  empty: {
    noProductsFound: string;
    noStoresFound: string;
    tryAdjustingSearch: string;
    tryAdjustingFilters: string;
    noRecentSearches: string;
    loadMoreResults: string;
  };

  // 首页扩展
  homeExtended: {
    trendingNow: string;
    trendingSubtitle: string;
    featuredServices: string;
    featuredSubtitle: string;
    browseCategories: string;
    electronics: string;
    digitalGoods: string;
    services: string;
    cryptoOtc: string;
  };

  // 搜索扩展
  searchExtended: {
    searchPlaceholder: string;
    recentSearches: string;
    clearAll: string;
    popularCategories: string;
    products: string;
    stores: string;
  };

  // 设置扩展
  settingsExtended: {
    profile: string;
    country: string;
    shippingAddresses: string;
    manageAddresses: string;
    blockedUsers: string;
    manageBlocked: string;
    pushNotifications: string;
    pushDescription: string;
    emailNotifications: string;
    emailDescription: string;
    store: string;
    privateStore: string;
    privateStoreDesc: string;
    storePolicies: string;
    storePoliciesDesc: string;
    moderators: string;
    moderatorsDesc: string;
    acceptedCrypto: string;
    selected: string;
    shippingOptions: string;
    shippingOptionsDesc: string;
    advanced: string;
    analytics: string;
    analyticsDesc: string;
    backupWallet: string;
    backupWalletDesc: string;
    backupProfile: string;
    backupProfileDesc: string;
    restoreProfile: string;
    restoreProfileDesc: string;
    resyncTransactions: string;
    resyncDesc: string;
    serverLogs: string;
    serverLogsDesc: string;
    checkForUpdates: string;
    upToDate: string;
    latestVersion: string;
    selectCountry: string;
    selectCurrency: string;
    acceptedCryptocurrencies: string;
    done: string;
    light: string;
    dark: string;
    restoreConfirmTitle: string;
    restoreConfirmDesc: string;
    continue: string;
    logoutConfirmTitle: string;
    logoutConfirmDesc: string;
    comingSoon: string;
    backupComingSoon: string;
    restoreComingSoon: string;
    followingSystem: string;
    enabled: string;
    disabled: string;
  };
}

// i18n 上下文类型
export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFunction;
  formatNumber: (num: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (date: Date | string | number) => string;
}
