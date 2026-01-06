/**
 * 国际化类型定义
 */

// 支持的语言
export type Locale = 'en' | 'zh';

// 默认语言
export const DEFAULT_LOCALE: Locale = 'en';

// 支持的语言列表
export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh'];

// 语言信息
export const LOCALE_INFO: Record<Locale, { name: string; nativeName: string; flag: string }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
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
