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

// 翻译字符串部分基础类型（允许嵌套对象）
interface TranslationSection {
  [key: string]: string | Record<string, unknown>;
}

// 翻译资源结构
export interface TranslationResource {
  // 通用
  common: TranslationSection & {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    accept: string;
    decline: string;
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
    noData: string;
    backToMarket: string;
    loadMore: string;
    noMoreData: string;
    comingSoon: string;
  };

  // 导航
  nav: TranslationSection & {
    home: string;
    search: string;
    messages: string;
    orders: string;
    profile: string;
    settings: string;
    wallet: string;
    cart: string;
    notifications: string;
    login: string;
    logout: string;
  };

  // 首页
  home: TranslationSection & {
    welcome: string;
    featured: string;
    trending: string;
    newArrivals: string;
    categories: string;
    viewAll: string;
  };

  // 个人中心 (Me) - 可选，fallback 到英文
  me?: TranslationSection & {
    title?: string;
    anonymous?: string;
    notLoggedIn?: string;
    loginPrompt?: string;
    myOrders?: string;
    purchases?: string;
    sales?: string;
    privacyGroups?: string;
    productGroups?: string;
    userGroups?: string;
    receivingAccounts?: string;
    receivingAccountsDesc?: string;
    wishlist?: string;
    wishlistDesc?: string;
    notifications?: string;
    notificationsDesc?: string;
    settings?: string;
    settingsDesc?: string;
    appearance?: string;
    darkModeDesc?: string;
    support?: string;
    supportDesc?: string;
    logout?: string;
  };

  // 商品
  product: TranslationSection & {
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
    shippingAtCheckout: string;
    estDelivery: string;
    returns: string;
    seller: string;
    reviews: string;
    rating: string;
    addToCart: string;
    addedToCart: string;
    buyNow: string;
    share: string;
    report: string;
    options: string;
    selectOption: string;
    variants: string;
    notFound: string;
    viewStore: string;
    acceptedCurrencies: string;
    termsAndConditions: string;
    refundPolicy: string;
    tags: string;
    noReviews: string;
    viewAllReviews: string;
    anonymous: string;
  };

  // 搜索
  search: TranslationSection & {
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
  cart: TranslationSection & {
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
  checkout: TranslationSection & {
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
  order: TranslationSection & {
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
    // Order detail page
    backToOrders: string;
    placedOn: string;
    orderNotFound: string;
    orderNotFoundMessage: string;
    loadOrderFailed: string;
    tryAgain: string;
    message: string;
    confirmReceipt: string;
    confirmingReceipt: string;
    openDispute: string;
    markAsShipped: string;
    refundOrder: string;
    shipOrder: string;
    // Timeline
    orderTimeline: string;
    orderPlaced: string;
    paymentConfirmed: string;
    vendorConfirmed: string;
    packageShipped: string;
    orderCompleted: string;
    fundsReleased: string;
    disputeOpened: string;
    disputeResolved: string;
    // Order items
    orderItems: string;
    quantity: string;
    subtotal: string;
    shipping: string;
    free: string;
    moderatorFee: string;
    // Parties
    seller: string;
    buyer: string;
    moderator: string;
    viewStore: string;
    // Address and payment
    shippingAddress: string;
    trackingNumber: string;
    paymentDetails: string;
    paymentTransaction: string;
    escrowAddress: string;
    orderNotes: string;
    // Dispute
    disputeOpen: string;
    initiatedBy: string;
    disputeStatus: string;
    favorBuyer: string;
  };

  // 聊天
  chat: TranslationSection & {
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
    // Sections
    directMessages: string;
    communities: string;
    orderChats: string;
    invitations: string;
    invitedYou: string;
    inviteConfirm: string;
    invitedBy: string;
    // Room settings
    roomSettings: string;
    roomId: string;
    members: string;
    directMessage: string;
    groupChat: string;
    viewStore: string;
    sendMessage: string;
    // User info
    unknownUser: string;
    externalUser: string;
    peerId: string;
    matrixId: string;
    // Time
    today: string;
    yesterday: string;
    connecting: string;
    startConversation: string;
  };

  // Matrix 房间事件
  matrix: TranslationSection & {
    events: {
      join: string;
      left: string;
      invited: string;
      kicked: string;
      banned: string;
      unbanned: string;
      nameChanged: string;
      avatarChanged: string;
      roomNameChanged: string;
      roomTopicChanged: string;
      encryptionEnabled: string;
      roomCreated: string;
    };
  };

  // 钱包
  wallet: TranslationSection & {
    title: string;
    balance: string;
    totalBalance: string;
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
    yourAssets: string;
    transactionHistory: string;
    clear: string;
    all: string;
    today: string;
    back: string;
    yourAddress: string;
    copy: string;
    connect: string;
    connecting: string;
    disconnect: string;
    connected: string;
  };

  // 用户资料
  profile: TranslationSection & {
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
    otc: string;
    posts: string;
    community: string;
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
    noProfileData: string;
  };

  // 设置
  settings: TranslationSection & {
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
    avatar: string;
    loadAvatar: string;
    loadHeader: string;
  };

  // 主题
  theme: TranslationSection & {
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
  errors: TranslationSection & {
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
  time: TranslationSection & {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    weeksAgo: string;
    monthsAgo: string;
    yearsAgo: string;
  };

  // Hero 区域
  hero: TranslationSection & {
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
  footer: TranslationSection & {
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
  marketplace: TranslationSection & {
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
  moderator: TranslationSection & {
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

  // 支付选择
  payment: TranslationSection & {
    selectPaymentMethod: string;
    selectPaymentMethodDesc: string;
    paymentMethod: string;
    otherMethods: string;
    showMore: string;
    showLess: string;
    noTokensAvailable: string;
    paymentProtection: string;
    protectFor: string;
    selectModerator: string;
    selectModeratorDesc: string;
    changeModerator: string;
    enableProtection: string;
    disableProtection: string;
  };

  // 筛选器
  filter: TranslationSection & {
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
  empty: TranslationSection & {
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
    currencyUpdated: string;
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

  // 用户菜单
  userMenu: {
    myProfile: string;
    myStore: string;
    createListing: string;
    sales: string;
    purchases: string;
    settings: string;
    logout: string;
  };

  // 设置弹框 (Settings Modal)
  settingsModal?: {
    // General tab
    languageDesc: string;
    helpTranslate: string;
    countryDesc: string;
    currencyDesc: string;
    matureContent: string;
    soundNotifications: string;
    soundNotificationsDesc: string;
    voiceAnnouncements: string;
    voiceAnnouncementsDesc: string;
    notificationVolume: string;
    test: string;
    soundTest: string;
    soundTestDesc: string;
    settingsSaved: string;
    saveFailed: string;
    // Page tab
    shortDescription: string;
    shortDescLimit: string;
    shortDescPlaceholder: string;
    locationDesc: string;
    locationPlaceholder: string;
    avatarDesc: string;
    selectPhoto: string;
    avatarUploaded: string;
    uploadFailed: string;
    aboutDesc: string;
    aboutPlaceholder: string;
    links: string;
    addLink: string;
    nameRequired: string;
    namePlaceholder: string;
    profileSaved: string;
    // Addresses tab
    newAddress: string;
    recipientName: string;
    company: string;
    optional: string;
    street: string;
    apartment: string;
    city: string;
    state: string;
    postalCode: string;
    deliveryNotes: string;
    deliveryNotesPlaceholder: string;
    addAddress: string;
    addressAdded: string;
    addressDeleted: string;
    fillRequired: string;
    // Blocked tab
    noBlockedUsers: string;
    unblock: string;
    // Moderation tab
    disputeResolution: string;
    disputeResolutionDesc: string;
    moderateDisputes: string;
    on: string;
    off: string;
    pricePerDispute: string;
    pricePerDisputeDesc: string;
    percentage: string;
    fixedAmount: string;
    moderationDescription: string;
    moderationDescPlaceholder: string;
    moderationTerms: string;
    moderationTermsPlaceholder: string;
    languages: string;
    readGuidelines: string;
    guidelinesLink: string;
    understandTerms: string;
    moderationSaved: string;
    // Chat Encryption tab
    e2eAvailable: string;
    myChatId: string;
    myChatIdDesc: string;
    chatIdCopied: string;
    copyFailed: string;
    chatIdNote: string;
    currentDevice: string;
    browserDevice: string;
    keyBackup: string;
    keyBackupDesc: string;
    backupExists: string;
    lastBackup: string;
    never: string;
    keysBackedUp: string;
    backupNow: string;
    restoreKeys: string;
    restoreKeysDesc: string;
    messageInvites: string;
    messageInvitesDesc: string;
    autoAcceptAll: string;
    autoAcceptAllDesc: string;
    autoAcceptMobazha: string;
    autoAcceptMobazhaDesc: string;
    alwaysConfirm: string;
    alwaysConfirmDesc: string;
    notLoggedIn: string;
    // Store tab
    customize: string;
    policyPlaceholder: string;
    termsPlaceholder: string;
    resyncComplete: string;
    resyncFailed: string;
  };

  // OTC 私密交易
  otc: TranslationSection & {
    title: string;
    createNft: string;
    createErc3525: string;
    createNftOrder: string;
    createOrder: string;
    noOtcYet: string;
    noOtcInStore: string;
    noOtcInMarketplace: string;
    createFirstOtc: string;
    beFirstToCreate: string;
    activeOrders: string;
    historyOrders: string;
    fetchError: string;
    // 步骤
    step: {
      selectNft: string;
      setPrice: string;
      shareLink: string;
    };
    // 状态
    status: {
      active: string;
      completed: string;
      cancelled: string;
    };
    // 表单
    price: string;
    priceDesc: string;
    shares: string;
    totalPrice: string;
    platformFeeNote: string;
    youWillReceive: string;
    selectNftDesc: string;
    // 操作
    creating: string;
    purchasing: string;
    cancelling: string;
    buyNow: string;
    buyShares: string;
    cancelOrder: string;
    confirmCancel: string;
    // 结果消息
    createFailed: string;
    orderCreated: string;
    purchaseSuccess: string;
    purchaseFailed: string;
    cancelSuccess: string;
    cancelFailed: string;
    orderNotFound: string;
    transactionCompleted: string;
    orderCancelled: string;
    // 分享
    shareText: string;
    shareToSell: string;
    shareToTelegram: string;
    viewOrder: string;
    createAnother: string;
    // 详情页
    contractInfo: string;
    seller: string;
    network: string;
    expectedRevenue: string;
    weeklyRevenue: string;
    annualizedRevenue: string;
    chatWithSeller: string;
    // 钱包
    connectWalletRequired: string;
    connectWalletDesc: string;
    backToStore: string;
    // 市场
    marketplaceOtcTitle: string;
    marketplaceOtcDesc: string;
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
