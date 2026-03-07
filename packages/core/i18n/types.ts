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

/**
 * 支持的语言列表（用于 UI 语言选择器）
 * 自动从 LOCALE_INFO 生成，使用 "原生名称 (英文名称)" 格式
 */
export const SUPPORTED_LANGUAGES: { code: Locale; name: string }[] = SUPPORTED_LOCALES.map(
  code => ({
    code,
    name: `${LOCALE_INFO[code].nativeName} (${LOCALE_INFO[code].name})`,
  })
);

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
    redirecting: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    accept: string;
    decline: string;
    save: string;
    discard: string;
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
    uploading?: string;
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
    prev?: string;
    processing?: string;
    publishing?: string;
    migrating?: string;
    optional?: string;
    required?: string;
    collapse?: string;
    expand?: string;
    clickToEdit?: string;
    deleteFailed?: string;
    create?: string;
    clearAll?: string;
    done?: string;
    dismiss?: string;
    selectAll?: string;
    selected?: string;
  };

  // 导航
  nav: TranslationSection & {
    home: string;
    market: string;
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

  // 登录页面（可选，fallback 到英文）
  login?: TranslationSection & {
    title?: string;
    subtitle?: string;
    hostedMode?: string;
    vpsMode?: string;
    redirectingToLogin?: string;
    pleaseWait?: string;
    loggingIn?: string;
    processing?: string;
    username?: string;
    password?: string;
    usernamePlaceholder?: string;
    passwordPlaceholder?: string;
    login?: string;
    loginRegister?: string;
    loginFailed?: string;
    usernamePasswordRequired?: string;
    hostedModeInfo?: string;
    supportedPlatforms?: string;
    browser?: string;
    testEnvironment?: string;
    productionEnvironment?: string;
    // 会话过期
    sessionExpiredTitle?: string;
    sessionExpiredMessage?: string;
    sessionExpiredAction?: string;
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
    wishlistEmpty?: string;
    wishlistEmptyDesc?: string;
    wishlistRemove?: string;
    wishlistItemCount?: string;
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
    wishlist: string;
    addToWishlist?: string;
    wishlisted?: string;
    priceDropped?: string;
    priceRose?: string;
    priceCheckingPrices?: string;
    timeJustNow?: string;
    timeMinutesAgo?: string;
    timeHoursAgo?: string;
    timeDaysAgo?: string;
    category: string;
    condition: string;
    shipping: string;
    freeShipping: string;
    shippingAtCheckout: string;
    estDelivery: string;
    returns: string;
    seller: string;
    reviews: string;
    reviewsTitle: string;
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
    goToStore: string;
    viewPhotos: string;
    details: string;
    acceptedCurrencies: string;
    termsAndConditions: string;
    refundPolicy: string;
    tags: string;
    discount?: {
      off?: string;
      freeShipping?: string;
      minPurchase?: string;
    };
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
    category: string;
    allCategories: string;
  };

  // 购物车
  cart: TranslationSection & {
    title: string;
    empty: string;
    emptyMessage: string;
    continueShopping: string;
    vendorStore: string;
    subtotal: string;
    shipping: string;
    total: string;
    checkout: string;
    remove: string;
    quantity: string;
    items: string;
    itemCount: string;
    itemCountOne: string;
    itemsInCart: string;
    itemsInCartOne: string;
    selectAll: string;
    deselectAll: string;
    orderSummary: string;
    proceedToCheckout: string;
    free: string;
    acceptedPayments: string;
    startShopping: string;
    clear: string;
    p2pNotice: string;
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

  // 地址管理
  address: TranslationSection & {
    title: string;
    addAddress: string;
    editAddress: string;
    deleteAddress: string;
    setDefault: string;
    setAsDefault: string;
    deleted: string;
    added: string;
    updated: string;
    name: string;
    namePlaceholder: string;
    nameRequired: string;
    company: string;
    companyPlaceholder: string;
    addressLineOne: string;
    addressLinePlaceholder: string;
    addressRequired: string;
    addressLineTwo: string;
    addressLineTwoPlaceholder: string;
    city: string;
    cityPlaceholder: string;
    cityRequired: string;
    state: string;
    statePlaceholder: string;
    postalCode: string;
    postalCodePlaceholder: string;
    country: string;
    countryPlaceholder: string;
    countryRequired: string;
    addressNotes: string;
    addressNotesPlaceholder: string;
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
    connectWallet: string;
    initializing: string;
    network: string;
    unknownNetwork: string;
    copyAddress: string;
    copied: string;
    viewInExplorer: string;
    walletDetails: string;
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
    rwa: string;
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
    coverSizeHint?: string;
    avatarSizeHint?: string;
    dragOrClickCover?: string;
    adjustCover?: string;
    adjustAvatar?: string;
    // 侧边栏导航
    sidebar?: {
      general: string;
      account: string;
      page: string;
      store: string;
      shipping: string;
      accessControl: string;
      privacy: string;
      userGroups: string;
      productGroups: string;
      accessRequests: string;
      addresses: string;
      blocked: string;
      moderation: string;
      receiving?: string;
      chatEncryption: string;
      advanced: string;
    };
    // 访问控制
    accessControl?: TranslationSection & {
      privacyDesc: string;
      userGroupsDesc: string;
      productGroupsDesc: string;
      requestsDesc: string;
    };
    // 账号绑定
    accountBinding?: {
      title: string;
      description: string;
      linked: string;
      available: string;
      link: string;
      unlink: string;
      linkSuccess: string;
      linkFailed: string;
      unlinkSuccess: string;
      unlinkFailed: string;
      unlinkConfirm: string;
      unlinkConfirmDesc: string;
      noLinked: string;
      notLinked: string;
      keepOne: string;
      keepOneDesc: string;
    };
  };

  moderatorSettings?: {
    title?: string;
    description?: string;
    enableToggle?: string;
    enableDescription?: string;
    feeSection?: string;
    feeType?: string;
    feeTypeFixed?: string;
    feeTypePercentage?: string;
    feeTypeFixedPlusPercentage?: string;
    percentage?: string;
    fixedAmount?: string;
    currency?: string;
    descriptionLabel?: string;
    descriptionPlaceholder?: string;
    termsLabel?: string;
    termsPlaceholder?: string;
    languagesLabel?: string;
    languagesPlaceholder?: string;
    acceptedCurrencies?: string;
    saveSuccess?: string;
    saveFailed?: string;
    disableSuccess?: string;
    disableFailed?: string;
    disableConfirm?: string;
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
    offlineDesc: string;
    backOnline: string;
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
    privacyFirst: string;
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
    shop?: string;
    storePolicy?: string;
    allProducts?: string;
    collections?: string;
  };

  // 政策页面
  policies?: TranslationSection;

  // 信任指标
  trust?: TranslationSection;

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
    digitalAssets: string;
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
    selected?: string;
    shippingOptions: string;
    shippingOptionsDesc: string;
    paymentAndShipping?: string;
    paymentAndShippingDesc?: string;
    storePoliciesSaved?: string;
    termsDesc?: string;
    termsPlaceholder?: string;
    storeModerators?: string;
    storeModeratorsDesc?: string;
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
    returnToPreviousPage: string;
    // Advanced tab sections
    privacy: string;
    backup: string;
    developer: string;
    about: string;
    dangerZone: string;
    deleteAccount: string;
    deleteAccountDesc: string;
    logoutWarning: string;
    version: string;
    enabled: string;
    disabled: string;
    displayModeDesc: string;
    themeStyle: string;
    themeStyleDesc: string;
    currentEffect: string;
    // Sound Settings
    soundSettings: string;
    soundNotifications: string;
    soundNotificationsDesc: string;
    voiceAnnouncements: string;
    voiceAnnouncementsDesc: string;
    volume: string;
    test: string;
    // Access Control
    accessControl: string;
    userGroups: string;
    userGroupsDesc: string;
    productGroups: string;
    productGroupsDesc: string;
    accessRequests: string;
    accessRequestsDesc: string;
    storeSettings: string;
    // Addresses
    addAddress: string;
    noAddresses: string;
    // Shipping
    addShipping?: string;
    addShippingHint?: string;
    enableModeration?: string;
    enableModerationDesc?: string;
    enableModerationHint?: string;
    moderatorBasicInfo?: string;
    moderatorBasicInfoDesc?: string;
    shortDescription?: string;
    shortDescriptionPlaceholder?: string;
    detailedDescription?: string;
    detailedDescriptionPlaceholder?: string;
    feeSettings?: string;
    feeSettingsDesc?: string;
    feeType?: string;
    feePercentage?: string;
    feeFixed?: string;
    feeFixedPlusPercentage?: string;
    percentageLabel?: string;
    percentageHint?: string;
    fixedAmount?: string;
    currency?: string;
    languagesAndCurrencies?: string;
    languagesAndCurrenciesDesc?: string;
    supportedLanguages?: string;
    selectAtLeastOneLanguage?: string;
    selectAtLeastOneCurrency?: string;
    moderatorTerms?: string;
    moderatorTermsDesc?: string;
    moderatorTermsPlaceholder?: string;
    contactInfo?: string;
    contactInfoDesc?: string;
    website?: string;
    moderatorSettingsSaved?: string;
    moderatorDetails?: string;
    moderatorDetailsDesc?: string;
    rating?: string;
    disputes?: string;
    successRate?: string;
    avgResolution?: string;
    removeModerator?: string;
    removeModeratorDesc?: string;
    remove?: string;
    receivingDesc?: string;
    loadFailed?: string;
    fillRequired?: string;
    addressExists?: string;
    addressAdded?: string;
    saveFailed?: string;
    addressUpdated?: string;
    addressDeleted?: string;
    deleteFailed?: string;
    addReceivingAddress?: string;
    coin?: string;
    selectCoin?: string;
    label?: string;
    labelPlaceholder?: string;
    address?: string;
    addressPlaceholder?: string;
    noReceivingAddresses?: string;
    noReceivingAddressesDesc?: string;
    addFirstAddress?: string;
    externalWallet?: string;
    confirmDelete?: string;
    deleteAddressDesc?: string;
    aboutReceiving?: string;
    receivingTip1?: string;
    receivingTip2?: string;
    receivingTip3?: string;
    receivingTip4?: string;
    privacyDesc?: string;
    storePrivacySection?: string;
    storePrivacySectionDesc?: string;
    privateStoreToggle?: string;
    privateStoreToggleDesc?: string;
    requireApproval?: string;
    requireApprovalDesc?: string;
    welcomeMessage?: string;
    noPendingRequests?: string;
    accessGranted?: string;
    accessDenied?: string;
    approve?: string;
    deny?: string;
    accessMgmt?: string;
    accessMgmtDesc?: string;
  };

  // 用户菜单
  userMenu: {
    account?: string;
    myProfile: string;
    myStore: string;
    viewStore?: string;
    createListing: string;
    sales: string;
    purchases: string;
    rwaAssets?: string;
    settings: string;
    logout: string;
  };

  // 设置弹框 (Settings Modal)
  settingsModal?: {
    // General tab
    languageAndRegion: string;
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
    unsavedChanges: string;
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
    fileTooLarge?: string;
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
    blockUser: string;
    blockUserDesc: string;
    enterPeerId: string;
    peerIdRequired: string;
    block: string;
    userBlocked: string;
    userUnblocked: string;
    noBlockedUsers: string;
    blockedOn: string;
    blockedAt: string;
    blockedDescription: string;
    peerID: string;
    peerIDPlaceholder: string;
    blockFailed: string;
    unblock: string;
    unblockFailed: string;
    unblockConfirmTitle: string;
    unblockConfirmDesc: string;
    // Contact Info
    contactInfo: string;
    email: string;
    emailPlaceholder: string;
    website: string;
    websitePlaceholder: string;
    phoneNumber: string;
    phonePlaceholder: string;
    // Social Links
    socialLinks: string;
    noSocialLinks: string;
    usernamePlaceholder: string;
    // Addresses tab extra
    addressesDescription: string;
    noAddresses: string;
    default: string;
    setDefault: string;
    defaultAddressSet: string;
    // Moderation tab
    addModerator: string;
    addModeratorDesc: string;
    moderationDesc: string;
    noModerators: string;
    moderatorAdded: string;
    moderatorRemoved: string;
    fee: string;
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
    e2eEncryption: string;
    e2eEncryptionDesc: string;
    yourEncryptionKey: string;
    created: string;
    keyFingerprint: string;
    fingerprintCopied: string;
    regenerateKeys: string;
    regenerateKeysWarning: string;
    regenerate: string;
    keysRegenerated: string;
    regenerateConfirmTitle: string;
    regenerateConfirmDesc: string;
    e2eAvailable: string;
    myChatId: string;
    myChatIdDesc: string;
    chatIdCopied: string;
    copyFailed: string;
    chatIdNote: string;
    currentDevice: string;
    deviceId: string;
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
    createErc3525Order: string;
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
      selectShares: string;
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
    selectSharesDesc: string;
    noNfts: string;
    noHoldings: string;
    yourShares: string;
    sharesToSell: string;
    pricePerShare: string;
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

  // 通知
  notifications?: TranslationSection & {
    title: string;
    markAllRead: string;
    noNotifications: string;
    noUnread: string;
    unreadCount: string;
    allCaughtUp: string;
    newNotificationsDesc: string;
    viewAll: string;
    filterAll: string;
    filterUnread: string;
    // 订单通知
    order: {
      youPlacedOrder: string;
      placedOrder: string;
      youReceivedOrder: string;
      yourPaymentSent: string;
      sentPayment: string;
      paymentLocked: string;
      lockedPayment: string;
      orderFunded: string;
      orderConfirmed: string;
      orderFulfilled: string;
      orderCompleted: string;
      acceptedYourOrder: string;
      youAcceptedOrder: string;
      declinedYourOrder: string;
      youDeclinedOrder: string;
      youCancelledOrder: string;
      cancelledOrder: string;
      refundedYourOrder: string;
      youRefundedOrder: string;
      fulfilledYourOrder: string;
      youFulfilledOrder: string;
      completedOrder: string;
    };
    // 争议通知
    dispute: {
      startedDispute: string;
      disputeOpened: string;
      disputeClosed: string;
      openedCase: string;
      modCaseOpened: string;
      caseUpdated: string;
      proposedOutcome: string;
      acceptedPayout: string;
      claimedPayment: string;
    };
    // 社交通知
    social: {
      startedFollowing: string;
      someoneFollowed: string;
      someoneUnfollowed: string;
      unfollowed: string;
      addedAsModerator: string;
      removedAsModerator: string;
    };
    // TTS (语音播报)
    tts: {
      newMessage: string;
      orderChat: string;
      newOrder: string;
      payment: string;
      dispute: string;
      orderComplete: string;
    };
  };

  // P2P 连接状态
  p2p?: TranslationSection & {
    connecting: string;
    failedToConnect: string;
    loadingText: string;
    failedTextListing: string;
    failedGeneric: string;
    connectingToVendor: string;
    fromP2pNetwork: string;
    socialHeading: string;
  };

  // 店铺访问
  storeAccess?: {
    requestSubmitted: string;
    waitingForApproval: string;
    requestRejected: string;
    requestRejectedDesc: string;
    privateStore: string;
    privateStoreDesc: string;
    privateStoreBadge: string;
    fullAccessGranted: string;
    accessingViaGroup: string;
    requestAccess: string;
    requestNote: string;
    requestNotePlaceholder: string;
    submitting: string;
    submitRequest: string;
    noAccess: string;
    noAccessDesc: string;
    // Access request management
    pendingRequests: string;
    approvedRequests: string;
    rejectedRequests: string;
    accessList: string;
    noAccessList: string;
    addUser: string;
    addUserHint: string;
    peerIDLabel: string;
    peerIDPlaceholder: string;
    removeFromList: string;
    confirmRemove: string;
    confirmRemoveMessage: string;
  };

  // 新用户引导
  onboarding?: {
    welcome: string;
    tagline: string;
    setupProfile: string;
    displayName: string;
    displayNamePlaceholder: string;
    displayNameRequired: string;
    shortBio: string;
    shortBioPlaceholder: string;
    avatar?: string;
    avatarHint?: string;
    changeAvatar?: string;
    country: string;
    countryPlaceholder: string;
    countrySearch?: string;
    popularCountries?: string;
    allCountries?: string;
    currency?: string;
    currencyPlaceholder?: string;
    currencyHint?: string;
    startExploring: string;
    customizeLater: string;
    creating: string;
    createFailed: string;
    // 价值主张
    valueDecentralized: string;
    valuePrivacy: string;
    valueMultiCurrency: string;
  };

  // 用户页面（店铺页面）
  userPage?: {
    customize: string;
    createListing: string;
    importListings: string;
    storeWelcomeCalloutTitle: string;
    storeWelcomeCalloutBody: string;
    storeWelcomeCalloutBtnClose: string;
  };

  // 导入商品
  importListings?: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    downloadTemplate: string;
    downloadError: string;
    step2Title: string;
    step2Desc: string;
    dropOrClick: string;
    maxSize: string;
    fileTooLarge: string;
    clearFile: string;
    startImport: string;
    importing: string;
    uploadingProgress: string;
    resultsTitle: string;
    total: string;
    created: string;
    updated: string;
    failed: string;
    errorDetails: string;
    row: string;
    showDetails: string;
    hideDetails: string;
    createdItems: string;
    updatedItems: string;
    success: string;
    importComplete: string;
    error: string;
  };

  imageCrop?: {
    adjustImage: string;
    zoom: string;
    rotate: string;
  };

  // 商品创建/编辑
  listing?: TranslationSection & {
    createListing: string;
    createListingDesc: string;
    editListing: string;
    productType: string;
    types: {
      physicalGood: string;
      physicalGoodDesc: string;
      digitalGood: string;
      digitalGoodDesc: string;
      service: string;
      serviceDesc: string;
      rwaToken: string;
      rwaTokenDesc: string;
    };
    wizard: {
      steps: {
        type: string;
        asset: string;
        basic: string;
        media: string;
        review: string;
      };
      selectType: string;
      selectTypeDesc: string;
      selectAsset: string;
      selectAssetDesc: string;
      configureAsset: string;
      configureAssetDesc: string;
      basicInfo: string;
      basicInfoDesc: string;
      media: string;
      mediaDesc: string;
      maxImages: string;
      videoSupport: string;
      review: string;
      reviewDesc: string;
      publish: string;
    };
    tabs: {
      general: string;
      photos: string;
      tags: string;
      productType: string;
      shipping: string;
      variants: string;
      policies: string;
      other: string;
    };
    basicInfo: string;
    title: string;
    titlePlaceholder: string;
    titleHelper: string;
    description: string;
    descriptionPlaceholder: string;
    price: string;
    priceHelper: string;
    condition: string;
    conditionHelper: string;
    weight: string;
    weightHelper: string;
    packageDimensions: {
      label: string;
      length: string;
      width: string;
      height: string;
      helper: string;
    };
    brand: {
      label: string;
      placeholder: string;
    };
    sku: string;
    skuPlaceholder: string;
    skuHelper: string;
    nsfw: string;
    conditions: {
      new: string;
      usedExcellent: string;
      usedGood: string;
      usedPoor: string;
      refurbished: string;
    };
    photos: string;
    photosHelper: string;
    primaryPhoto: string;
    imageAlt: {
      edit: string;
      placeholder: string;
      default: string;
    };
    add: string;
    introVideo: string;
    externalVideoLink: string;
    videoTooLarge: string;
    noImage: string;
    tags: string;
    tagsHelper: string;
    tagsDesc: string;
    enterTag: string;
    productTypeHelper: string;
    productTypePlaceholder: string;
    shippingOptions: string;
    shippingOptionsHelper: string;
    manageShippingOptions: string;
    selectShippingOptions: string;
    noShippingSelected: string;
    noShippingOptionsConfigured: string;
    goToSettings: string;
    services: string;
    localPickup: string;
    fixedPrice: string;
    worldwide: string;
    free: string;
    variants: {
      title: string;
      dashPlaceholder: string;
      unlimitedPlaceholder: string;
      barcodePlaceholder: string;
      weightPlaceholder: string;
    };
    variantsHelper: string;
    variantsDesc: string;
    addVariant: string;
    variant: {
      optionName: string;
      optionNamePlaceholder: string;
      optionValues: string;
      addFirstValue: string;
      addValuePlaceholder: string;
      addValueHint: string;
      untitledOption: string;
      valuesCount: string;
      addOption: string;
      addAnotherOption: string;
      customOption: string;
      chooseOption: string;
      limitHint: string;
      suggestedOptions: {
        size: string;
        color: string;
        material: string;
        style: string;
      };
      image: string;
      selectImage: string;
      variant: string;
      price: string;
      compareAtPrice: string;
      quantity: string;
      barcode: string;
      weight: string;
      unlimited: string;
      skuCount: string;
      basePriceHint: string;
      selectedCount: string;
      moveUp: string;
      moveDown: string;
      removeOption: string;
      removeValue: string;
      bulkPrice: string;
      bulkCompareAtPrice: string;
      bulkQuantity: string;
      bulkWeight: string;
      bulkApply: string;
      bulkCancel: string;
      error: {
        maxOptions: string;
        maxValues: string;
        duplicateOptionName: string;
        maxCombinations: string;
      };
    };
    policies: string;
    returnPolicy: string;
    returnPolicyPlaceholder: string;
    returnPolicyHelper: string;
    termsAndConditions: string;
    termsPlaceholder: string;
    termsHelper: string;
    rwaTokenDetails: string;
    blockchain: string;
    blockchainHelper: string;
    selectRwaToken: string;
    searchTokens: string;
    enterAddress: string;
    searchTokenPlaceholder: string;
    tokenAddressHelper: string;
    noTokensFound: string;
    search: string;
    selectedTokenInfo: string;
    tokenName: string;
    tokenSymbol: string;
    tokenType: string;
    currentPrice: string;
    issuer: string;
    riskLevel: string;
    verification: string;
    acceptedCurrencies: string;
    acceptedCurrenciesHelper: string;
    addPaymentCurrency: string;
    minQuantity: string;
    minQuantityHelper: string;
    maxQuantity: string;
    maxQuantityHelper: string;
    rwa: {
      realEstate: string;
      bond: string;
      commodity: string;
      art: string;
      carbonCredit: string;
      custom: string;
      // Extended RWA fields
      customAsset?: string;
      selectAssetType?: string;
      selectAsset?: string;
      selectedAsset?: string;
      assetTypes?: {
        creator: string;
        broadway: string;
        custom: string;
      };
      assetTypesDesc?: {
        creator: string;
        broadway: string;
        custom: string;
      };
      tokenStandard?: string;
      selectTokenStandard?: string;
      contractAddress?: string;
      slotIdHelper?: string;
      availableQty?: string;
      available?: string;
      holders?: string;
      dividendRate?: string;
      membershipInfo?: string;
      memberLevel?: string;
      currentHolders?: string;
      exclusivePerks?: string;
      validity?: string;
      revenueInfo?: string;
      totalShares?: string;
      annualRate?: string;
      settlementPeriod?: string;
      holderRights?: string;
      walletConnected?: string;
      pleaseConnectWallet?: string;
      showingRealBalance?: string;
      connectWalletHint?: string;
      // Balance Display
      liveBalance?: string;
      staticBalance?: string;
      refreshBalance?: string;
      loading?: string;
      loadFailed?: string;
      copied?: string;
      addressCopied?: string;
      contract?: string;
      // Product Detail Page - Asset Display
      verifiedAsset?: string;
      // Trade Mode Hints (for buyer display)
      instantTrade?: string;
      confirmTrade?: string;
      instantTradeHint?: string;
      confirmTradeHint?: string;
      escrowProtection?: string;
      escrowTimeout?: string;
      acceptedPayments?: string;
      atomicSwap?: string;
      atomicSwapShort?: string;
      atomicSwapPurchase?: string;
      atomicSwapDescription?: string;
      instantSwap?: string;
      instantSwapShort?: string;
      instantSwapPurchase?: string;
      instantSwapDescription?: string;
      step1Title?: string;
      step1Desc?: string;
      step2Title?: string;
      step2Desc?: string;
      step3Title?: string;
      step3Desc?: string;
      instantStep2Title?: string;
      instantStep2Desc?: string;
      safetyNote?: string;
      blockchainInfo?: string;
      network?: string;
      // NFT Metadata (ERC721)
      nftMetadata?: string;
      creator?: string;
      collection?: string;
      rarity?: string;
      mintedAt?: string;
    };
    // Publish
    publish: string;
    saveDraft?: string;

    // Short Description
    shortDescription?: string;
    shortDescriptionPlaceholder?: string;
    shortDescriptionHelper?: string;

    // Compare At Price
    compareAtPrice?: string;
    compareAtPriceHelper?: string;
    discount?: string;

    // Barcode
    barcode?: string;
    barcodePlaceholder?: string;
    barcodeHelper?: string;

    // Status
    statusDraft?: string;
    statusPublished?: string;
    statusPrivate?: string;
    draftSaved?: string;

    // NSFW
    nsfwLabel: string;
    nsfwDesc: string;

    // Processing Time
    processingTime: string;
    processingTimePlaceholder: string;
    processingTimeHelper: string;
    processingTimeOptions: {
      placeholder: string;
      '1day': string;
      '1to3days': string;
      '3to5days': string;
      '5to7days': string;
      '1to2weeks': string;
      '2to4weeks': string;
      custom: string;
    };

    // Return Policy Templates
    returnPolicyTemplates: {
      placeholder: string;
      '30dayLabel': string;
      '30day': string;
      '15dayLabel': string;
      '15day': string;
      noReturnLabel: string;
      noReturn: string;
      custom: string;
    };

    termsTemplates?: {
      placeholder: string;
      standardLabel: string;
      standard: string;
      digitalLabel: string;
      digital: string;
      handmadeLabel: string;
      handmade: string;
      custom: string;
    };

    // Inventory Policy
    inventoryPolicy: {
      label: string;
      helper: string;
    };

    // Clone
    cloneListing?: string;
    loadingCloneData?: string;
    cloneNotFound?: string;
    cloneFailed?: string;

    // Shipping Profile
    shippingProfile?: string;
    selectShippingProfile?: string;
    manageProfiles?: string;

    preview: string;
    productTitle: string;
    validationFailed: string;
    createSuccess: string;
    createFailed?: string;
    updateSuccess: string;
    deleteSuccess: string;
    deleteFailed: string;
    deleteConfirmTitle: string;
    deleteConfirmDesc: string;
    notFound: string;
  };

  // Share
  share?: {
    copyLink: string;
    linkCopied: string;
    shareToTwitter: string;
    shareToTelegram: string;
    shareProduct: string;
  };

  // Review (product reviews / ratings)
  review?: {
    summary: string;
    noReviews: string;
    anonymous: string;
    averageRating: string;
    outOf5: string;
    basedOn: string;
    showMore: string;
    showLess: string;
  };

  // Validation messages
  validation?: {
    required: string;
    titleRequired: string;
    priceRequired: string;
  };

  // RWA Digital Assets Tab & Atomic Swap flows
  rwa?: {
    // Tab related
    fetchError?: string;
    filterTokenStandard?: string;
    filterTradeMode?: string;
    membership?: string;
    share?: string;
    instantTrade?: string;
    confirmRequired?: string;
    foundItems?: string;
    noRwaYet?: string;
    noRwaInStore?: string;
    createFirstRwa?: string;
    // Purchase flow
    purchase: {
      connectWallet: string;
      connectDesc: string;
      connectFailed?: string;
      serviceNotReady?: string;
      authorize: string;
      approving: string;
      approvingDesc: string;
      executing?: string;
      executingDesc?: string;
      locking?: string;
      lockingDesc?: string;
      lockPayment?: string;
      lockTimeout?: string;
      lockFailed?: string;
      cancelLock?: string;
      cancelFailed?: string;
      payNow?: string;
      instantDesc?: string;
      waitingSeller: string;
      waitingDesc: string;
      completed: string;
      completedDesc: string;
      error: string;
      failed?: string;
      executeFailed?: string;
      viewTransaction?: string;
      connectedAs?: string;
      payingFrom?: string;
      confirm?: string;
      confirmLock?: string;
      confirmLockDesc?: string;
      confirmPurchase?: string;
      confirmPurchaseDesc?: string;
    };
    fulfill: {
      waitingBuyer: string;
      waitingDesc: string;
      readyToShip: string;
      readyDesc: string;
      executeSwap: string;
      executing: string;
      executingDesc: string;
      completed: string;
      completedDesc: string;
      error: string;
    };
  };

  // RWA Dashboard
  rwaDashboard?: {
    title: string;
    walletNotConnected: string;
    connectWalletHint: string;
    connectWallet: string;
    walletConnected: string;
    totalAssets: string;
    assetTypes: string;
    heldAssets: string;
    assetTypesCount: string;
    shares: string;
    erc3525Contract: string;
    unknownAsset: string;
    recentTransactions: string;
    filtered: string;
    viewAll: string;
    collapse: string;
    loadingMore: string;
    noTransactions: string;
    noTransactionsFiltered: string;
    txType: {
      label: string;
      transferIn: string;
      transferOut: string;
      mint: string;
      burn: string;
      unknown: string;
    };
    initiated: string;
    // Desktop table headers
    asset: string;
    amount: string;
    time: string;
    txHash: string;
    // Desktop statistics
    totalBalance: string;
    todayTransactions: string;
    // Desktop placeholder
    selectAsset: string;
    selectAssetHint: string;
    noAssets: string;
    noAssetsHint: string;
    // Price history
    priceHistory: string;
    lastPrice: string;
    highPrice: string;
    lowPrice: string;
    avgPrice: string;
    noData: string;
    priceHistoryNotAvailable: string;
    timeRange: {
      '1W': string;
      '1M': string;
      ALL: string;
    };
  };

  // 配送选项配置
  shippingConfig?: TranslationSection & {
    noOptions?: string;
    noOptionsDesc?: string;
    deleteSuccess?: string;
    deleteConfirmTitle?: string;
    deleteConfirmDesc?: string;
  };

  // 配送设置
  shipping?: TranslationSection & {
    // 配送档案（Shopify 模式）
    shippingProfiles?: string;
    shippingOptions?: string;
    upgradeToProfiles?: string;
    upgradeDesc?: string;
    migrateNow?: string;
    migrateSuccess?: string;
    migrateFailed?: string;
    createProfile?: string;
    addProfile?: string;
    editProfile?: string;
    deleteProfileTitle?: string;
    profileDeleted?: string;
    profileName?: string;
    profileNamePlaceholder?: string;
    defaultProfileName?: string;
    defaultProfileSet?: string;
    setAsDefault?: string;
    orUseTemplate?: string;
    cannotDeleteDefault?: string;
    addOptionToProfile?: string;
    viewOptions?: string;
    option?: string;
    options?: string;
    region?: string;
    multipleCurrencies?: string;
    // 标题
    createOption: string;
    editOption: string;
    optionCreated: string;
    optionUpdated: string;
    // 基本信息
    basicInfo: string;
    optionName: string;
    optionNamePlaceholder: string;
    shippingType: string;
    currency: string;
    pricingModel: string;
    // 配送类型
    type: {
      FIXED_PRICE: string;
      LOCAL_PICKUP: string;
    };
    // 服务类型
    serviceType: {
      FIRST_RENEWAL_FEE: string;
      SAME_WEIGHT_SAME_FEE: string;
    };
    // 服务类型标签（卡片显示）
    serviceTypeLabel?: {
      firstRenewal: string;
      flatRate: string;
    };
    firstRenewalFeeDesc: string;
    sameWeightSameFeeDesc: string;
    // 地区
    shippingRegions: string;
    selectRegions: string;
    regionsSelected: string;
    selectAtLeastOneRegion: string;
    worldwide: string;
    popularCountries: string;
    allCountries: string;
    regions: string;
    noRegions: string;
    // 服务
    shippingServices: string;
    service: string;
    services: string;
    addService: string;
    addAtLeastOneService: string;
    serviceName: string;
    serviceNamePlaceholder: string;
    estimatedDelivery: string;
    deliveryPlaceholder: string;
    // 重量和定价
    firstWeight: string;
    firstFreight: string;
    renewalUnitWeight: string;
    renewalUnitPrice: string;
    startWeight: string;
    endWeight: string;
    shippingFee: string;
    registrationFee: string;
    // 卡片显示
    unnamed: string;
    // 免邮设置
    freeShipping?: string;
    enableFreeShipping?: string;
    freeShippingDesc?: string;
    minAmountForFreeShipping?: string;
    freeShippingExample?: string;
    freeShippingBadge?: string;
    spendMoreForFreeShipping?: string;
    // 配送区域（Shopify 风格）
    shippingZones?: string;
    zone?: string;
    zones?: string;
    addZone?: string;
    editZone?: string;
    deleteZone?: string;
    zoneName?: string;
    zoneNamePlaceholder?: string;
    zoneCreated?: string;
    zoneUpdated?: string;
    zoneDeleted?: string;
    zoneAdded?: string;
    noZones?: string;
    noZonesDesc?: string;
    viewZones?: string;
    unnamedZone?: string;
    deleteZoneTitle?: string;
    // 运费费率
    shippingRates?: string;
    rate?: string;
    rates?: string;
    addRate?: string;
    editRate?: string;
    deleteRate?: string;
    rateName?: string;
    rateNamePlaceholder?: string;
    ratePrice?: string;
    rateCreated?: string;
    rateUpdated?: string;
    rateDeleted?: string;
    noRates?: string;
    noRatesDesc?: string;
    // 费率条件
    addCondition?: string;
    conditionType?: string;
    selectCondition?: string;
    noCondition?: string;
    basedOnWeight?: string;
    basedOnPrice?: string;
    minWeight?: string;
    maxWeight?: string;
    minOrderAmount?: string;
    maxOrderAmount?: string;
    noLimit?: string;
    weightConditionHint?: string;
    priceConditionHint?: string;
    // 发货地点
    shippingLocations?: string;
    location?: string;
    locations?: string;
    addLocation?: string;
    editLocation?: string;
    deleteLocation?: string;
    locationName?: string;
    locationNamePlaceholder?: string;
    locationAddress?: string;
    locationCreated?: string;
    locationUpdated?: string;
    locationDeleted?: string;
    defaultLocation?: string;
    setAsDefaultLocation?: string;
    noLocations?: string;
    noLocationsDesc?: string;
    defaultLocationSet?: string;
    locationAddressPlaceholder?: string;
    locationAddressHint?: string;
    unnamedLocation?: string;
    // 地点组（渐进式 UI）
    locationGroups?: string;
    locationGroup?: string;
    addLocationGroup?: string;
    editLocationGroup?: string;
    deleteLocationGroup?: string;
    selectLocations?: string;
    locationsSelected?: string;
  };

  // 运费模板
  shippingTemplates?: TranslationSection & {
    quickStart?: string;
    quickStartDesc?: string;
    createCustom?: string;
    domesticStandard?: string;
    domesticStandardDesc?: string;
    worldwideFlat?: string;
    worldwideFlatDesc?: string;
    express?: string;
    expressDesc?: string;
    localPickup?: string;
    localPickupDesc?: string;
  };

  // 空状态组件
  emptyState?: {
    noProducts?: {
      title: string;
      description: string;
      createProduct: string;
      browseMarket: string;
    };
    emptyCart?: {
      title: string;
      description: string;
      startShopping: string;
    };
    noMessages?: {
      title: string;
      description: string;
      startChat: string;
    };
    noNotifications?: {
      title: string;
      description: string;
    };
    noOrders?: {
      allTitle: string;
      purchasesTitle: string;
      salesTitle: string;
      allDescription: string;
      purchasesDescription: string;
      salesDescription: string;
      browseProducts: string;
    };
    noSearchResults?: {
      title: string;
      descriptionWithQuery: string;
      description: string;
      clearSearch: string;
    };
    noFollowers?: {
      followersTitle: string;
      followingTitle: string;
      followersDescription: string;
      followingDescription: string;
    };
    noFavorites?: {
      title: string;
      description: string;
      browseProducts: string;
    };
    emptyWallet?: {
      title: string;
      description: string;
      deposit: string;
    };
    noStore?: {
      title: string;
      description: string;
      setupStore: string;
    };
    noHistory?: {
      title: string;
      description: string;
    };
    noDisputes?: {
      title: string;
      description: string;
    };
  };

  ai?: {
    assist?: string;
    improveTitle?: string;
    polishDescription?: string;
    suggestTags?: string;
    generateFromImages?: string;
    generateFromImagesDesc?: string;
    generating?: string;
    generateAll?: string;
    applyAll?: string;
    regenerate?: string;
    notConfigured?: string;
    setupPrompt?: string;
    goToSettings?: string;
    error?: string;
  };

  standalone?: {
    storeName?: string;
    allProducts?: string;
    browseOurCollection?: string;
    products?: string;
    searchProducts?: string;
  };

  moderation?: {
    title?: string;
    description?: string;
    totalCases?: string;
    open?: string;
    pending?: string;
    resolved?: string;
    expired?: string;
    decided?: string;
    all?: string;
    sortNewest?: string;
    sortOldest?: string;
    sortAmount?: string;
    sort?: string;
    caseNumber?: string;
    newMessages?: string;
    claim?: string;
    buyer?: string;
    seller?: string;
    opened?: string;
    noCasesFound?: string;
    noCasesFilterHint?: string;
    noCasesDesc?: string;
    caseDetail?: string;
  };
  admin?: {
    title?: string;
    nav?: {
      dashboard?: string;
      products?: string;
      orders?: string;
      analytics?: string;
      discounts?: string;
      settings?: string;
      storefront?: string;
      viewStore?: string;
      help?: string;
      openMenu?: string;
      closeMenu?: string;
      expandSidebar?: string;
      collapseSidebar?: string;
      collections?: string;
      backToMarketplace?: string;
    };
    dashboard?: {
      welcome?: string;
      subtitle?: string;
      totalSales?: string;
      designStore?: string;
      designStoreDesc?: string;
      totalOrders?: string;
      newOrders?: string;
      activeProducts?: string;
      avgRating?: string;
      allTime?: string;
      last7Days?: string;
      published?: string;
      storeRating?: string;
      completedOrders?: string;
      reviewCount?: string;
      noReviews?: string;
      emptyTitle?: string;
      emptyDescription?: string;
      createFirstProduct?: string;
      setupStore?: string;
      addProduct?: string;
      addProductDesc?: string;
      manageOrders?: string;
      manageOrdersDesc?: string;
      viewStore?: string;
      viewStoreDesc?: string;
      recentOrders?: string;
      topProducts?: string;
      viewAll?: string;
      noOrdersYet?: string;
      noProductsYet?: string;
      noPaymentMethodsWarning?: string;
      setUpPayments?: string;
      setUpPaymentsDesc?: string;
      failedToLoadProducts?: string;
    };
    products?: {
      title?: string;
      subtitle?: string;
      count?: string;
      addProduct?: string;
      searchPlaceholder?: string;
      filterAll?: string;
      filterActive?: string;
      filterDraft?: string;
      emptyTitle?: string;
      emptyDescription?: string;
      addFirstProduct?: string;
      noResults?: string;
      noResultsDesc?: string;
      colProduct?: string;
      colType?: string;
      colPrice?: string;
      preview?: string;
      edit?: string;
      duplicate?: string;
      delete?: string;
      deleteConfirm?: string;
      deleteSelected?: string;
      bulkDeleteConfirm?: string;
      typePhysical?: string;
      typeDigital?: string;
      typeService?: string;
      typeCrypto?: string;
      viewTable?: string;
      viewGrid?: string;
      selectAll?: string;
      selectProduct?: string;
    };
    orders?: {
      title?: string;
      subtitle?: string;
      export?: string;
      searchPlaceholder?: string;
      filterAll?: string;
      filterPending?: string;
      filterProcessing?: string;
      filterShipped?: string;
      filterCompleted?: string;
      filterDisputed?: string;
      filterCancelled?: string;
      clearFilters?: string;
      dateFrom?: string;
      dateTo?: string;
      emptyTitle?: string;
      emptyDescription?: string;
      noMatchTitle?: string;
      noMatchDescription?: string;
      selectAll?: string;
      clearSelection?: string;
      selectedCount?: string;
      batchConfirm?: string;
      batchConfirmSuccess?: string;
      noPendingSelected?: string;
      showingCount?: string;
    };
    analytics?: {
      title?: string;
      subtitle?: string;
      comingSoon?: string;
      comingSoonDesc?: string;
    };
    discounts?: {
      title?: string;
      subtitle?: string;
      create?: string;
      createTitle?: string;
      editTitle?: string;
      searchPlaceholder?: string;
      emptyTitle?: string;
      emptyDescription?: string;
      statusActive?: string;
      statusScheduled?: string;
      statusExpired?: string;
      statusDraft?: string;
      automatic?: string;
      usageCount?: string;
      method?: string;
      methodCode?: string;
      methodAutomatic?: string;
      titleLabel?: string;
      titlePlaceholder?: string;
      descriptionLabel?: string;
      descriptionPlaceholder?: string;
      descriptionHint?: string;
      valueSection?: string;
      valueType_PERCENTAGE?: string;
      valueType_FIXED_AMOUNT?: string;
      valueType_FREE_SHIPPING?: string;
      valueType_percentage?: string;
      valueType_fixed_amount?: string;
      valueType_free_shipping?: string;
      scopeCollections?: string;
      collectionIDsLabel?: string;
      valueLabel?: string;
      maxDiscountAmount?: string;
      currencyLabel?: string;
      optional?: string;
      minimumPurchase?: string;
      minimumPurchasePlaceholder?: string;
      appliesTo?: string;
      scopeAll?: string;
      scopeSpecific?: string;
      productSlugsLabel?: string;
      productSlugsPlaceholder?: string;
      usageLimits?: string;
      totalUsageLimit?: string;
      perCustomerLimit?: string;
      unlimited?: string;
      combinations?: string;
      combinesProduct?: string;
      combinesOrder?: string;
      combinesShipping?: string;
      activeDates?: string;
      startsAt?: string;
      endsAt?: string;
      endsAtHint?: string;
      codesSection?: string;
      codePlaceholder?: string;
      used?: string;
      save?: string;
      created?: string;
      saved?: string;
      deleted?: string;
      fetchError?: string;
      createError?: string;
      saveError?: string;
      deleteError?: string;
      deleteConfirmTitle?: string;
      deleteConfirmDescription?: string;
      codeAddError?: string;
      codeDeleteError?: string;
    };
    collections?: {
      title?: string;
      subtitle?: string;
      empty?: string;
      create?: string;
      createTitle?: string;
      editTitle?: string;
      searchPlaceholder?: string;
      emptyTitle?: string;
      emptyDescription?: string;
      titleLabel?: string;
      titlePlaceholder?: string;
      titleRequired?: string;
      descriptionLabel?: string;
      descriptionPlaceholder?: string;
      imageLabel?: string;
      sortOrderLabel?: string;
      sortManual?: string;
      sortAlphaAsc?: string;
      sortAlphaDesc?: string;
      sortPriceAsc?: string;
      sortPriceDesc?: string;
      sortCreatedDesc?: string;
      sortCreatedAsc?: string;
      sortDateAsc?: string;
      sortDateDesc?: string;
      sortBestSelling?: string;
      publishedLabel?: string;
      unpublishedLabel?: string;
      publishedToggle?: string;
      publishedDesc?: string;
      publishedHint?: string;
      productsSection?: string;
      productsCount?: string;
      addProducts?: string;
      removeProduct?: string;
      noProducts?: string;
      addProductsHint?: string;
      selectProducts?: string;
      selectProductsDesc?: string;
      save?: string;
      created?: string;
      saved?: string;
      deleted?: string;
      fetchError?: string;
      createError?: string;
      saveError?: string;
      deleteError?: string;
      deleteConfirmTitle?: string;
      deleteConfirmDescription?: string;
      productAdded?: string;
      productRemoved?: string;
      productAddError?: string;
      productRemoveError?: string;
      addProductsTitle?: string;
      addProductsSearch?: string;
      noProductsAvailable?: string;
      addSelected?: string;
      addProductError?: string;
      removeProductError?: string;
      imageHint?: string;
      imageAlt?: string;
      imageRemove?: string;
      dragToReorder?: string;
      uploadError?: string;
      reorderError?: string;
    };
    onboarding?: {
      title?: string;
      subtitle?: string;
      step1Label?: string;
      step2Label?: string;
      step3Label?: string;
      designWithAi?: string;
      designWithAiDesc?: string;
      step1Title?: string;
      step1Desc?: string;
      step2Title?: string;
      step2Desc?: string;
      storeName?: string;
      storeNamePlaceholder?: string;
      storeDescription?: string;
      storeDescPlaceholder?: string;
      changeAvatar?: string;
      clickToUpload?: string;
      nameRequired?: string;
      saveFailed?: string;
      createProduct?: string;
      featureAi?: string;
      featureVariants?: string;
      featureShipping?: string;
      featurePricing?: string;
      completeTitle?: string;
      completeDesc?: string;
      viewStore?: string;
      goToDashboard?: string;
      next?: string;
      back?: string;
      skip?: string;
      skipStep?: string;
    };
    settings?: {
      title?: string;
      subtitle?: string;
      sectionStore?: string;
      sectionTransaction?: string;
      sectionExtensions?: string;
      profile?: string;
      profileDesc?: string;
      store?: string;
      storeDesc?: string;
      policies?: string;
      policiesDesc?: string;
      shipping?: string;
      shippingDesc?: string;
      moderators?: string;
      moderatorsDesc?: string;
      general?: string;
      generalDesc?: string;
      accessControl?: string;
      accessControlDesc?: string;
      payments?: string;
      paymentsDesc?: string;
      integrations?: string;
      integrationsDesc?: string;
    };
    integrations?: {
      title?: string;
      subtitle?: string;
      tabNotifications?: string;
      tabWebhooks?: string;
      tabAI?: string;
      tabPayments?: string;
      channels?: string;
      channelsDesc?: string;
      addChannel?: string;
      editChannel?: string;
      deleteChannel?: string;
      deleteConfirm?: string;
      deleteConfirmDesc?: string;
      testChannel?: string;
      testing?: string;
      testSuccess?: string;
      testFailed?: string;
      noChannels?: string;
      noChannelsDesc?: string;
      enabled?: string;
      disabled?: string;
      name?: string;
      namePlaceholder?: string;
      type?: string;
      eventFilter?: string;
      eventFilterAll?: string;
      eventFilterAllDesc?: string;
      eventFilterCustom?: string;
      eventFilterCustomDesc?: string;
      eventCategoryOrder?: string;
      eventCategoryOrderDesc?: string;
      eventCategoryDispute?: string;
      eventCategoryDisputeDesc?: string;
      eventCategorySocial?: string;
      eventCategorySocialDesc?: string;
      eventCategoryChat?: string;
      eventCategoryChatDesc?: string;
      eventCategoryWallet?: string;
      eventCategoryWalletDesc?: string;
      eventCategoryPayment?: string;
      eventCategoryPaymentDesc?: string;
      eventCategoryPublish?: string;
      eventCategoryPublishDesc?: string;
      eventCategoryCart?: string;
      eventCategoryCartDesc?: string;
      eventCategoryChatgroup?: string;
      eventCategoryChatgroupDesc?: string;
      save?: string;
      cancel?: string;
      saving?: string;
      saved?: string;
      deleted?: string;
      saveFailed?: string;
      deleteFailed?: string;
      passwordUnchanged?: string;
      telegramSetupTitle?: string;
      telegramStep1?: string;
      telegramStep2?: string;
      telegramStep3?: string;
      telegramDocsLink?: string;
      telegramBotTokenHelp?: string;
      telegramChatIdHelp?: string;
      detectChat?: string;
      detectChatDesc?: string;
      detecting?: string;
      detectSuccess?: string;
      detectNoChats?: string;
      detectFailed?: string;
      detectSelectChat?: string;

      webhooks?: string;
      webhooksDesc?: string;
      addWebhook?: string;
      editWebhook?: string;
      deleteWebhook?: string;
      deleteWebhookConfirm?: string;
      webhookUrl?: string;
      webhookUrlInvalid?: string;
      webhookTest?: string;
      webhookTestSuccess?: string;
      webhookTestFailed?: string;
      webhookSaved?: string;
      webhookSaveFailed?: string;
      webhookDeleted?: string;
      webhookDeleteFailed?: string;
      webhookDetails?: string;
      webhookCreatedAt?: string;
      webhookSecretTitle?: string;
      webhookSecretWarning?: string;
      webhookSecretDone?: string;
      noWebhooks?: string;
      noWebhooksDesc?: string;
      webhookGuideTitle?: string;
      webhookGuidePayload?: string;
      webhookGuidePayloadDesc?: string;
      webhookGuideSignature?: string;
      webhookGuideSignatureDesc?: string;
      webhookGuideRetry?: string;
      webhookGuideRetryDesc?: string;

      aiTitle?: string;
      aiDesc?: string;
      aiFeatureGenerate?: string;
      aiFeaturePolish?: string;
      aiFeatureStore?: string;
      aiProvider?: string;
      aiProviderPlaceholder?: string;
      aiGetApiKey?: string;
      aiApiKey?: string;
      aiApiKeyPlaceholder?: string;
      aiApiKeySet?: string;
      aiApiKeyUpdate?: string;
      aiModel?: string;
      aiModelPlaceholder?: string;
      aiBaseUrl?: string;
      aiEnabled?: string;
      aiSaveSuccess?: string;
      aiSaveFailed?: string;
      aiNotConfigured?: string;
      aiConfigured?: string;
      aiLoadFailed?: string;
      aiApiKeyRequired?: string;
      aiBaseUrlPlaceholder?: string;
      aiBaseUrlRequired?: string;
      aiTestConnection?: string;
      aiTestSuccess?: string;
      aiTestFailed?: string;
      aiAdvancedSettings?: string;
      aiModelCustom?: string;
      aiModelCustomPlaceholder?: string;
      aiSaveActivate?: string;
      aiProviderActive?: string;
      aiApiKeySaved?: string;
      unsavedChanges?: string;

      paymentProviders?: { title?: string; subtitle?: string };
      paymentProvidersDesc?: string;
      stripeTitle?: string;
      stripeDesc?: string;
      paypalTitle?: string;
      paypalDesc?: string;
      providerConnected?: string;
      providerNotConnected?: string;
      providerPending?: string;
      providerRestricted?: string;
      statusRestricted?: string;
      statusActive?: string;
      statusPending?: string;
      connectProvider?: string;
      disconnectProvider?: string;
      disconnectConfirm?: string;
      secretKey?: string;
      publishableKey?: string;
      webhookSecret?: string;
      clientId?: string;
      clientSecret?: string;
      webhookId?: string;
      saveConfig?: string;
      configSaved?: string;
      configSaveFailed?: string;
      configDeleted?: string;
      configDeleteFailed?: string;
    };
    storeBranding?: {
      pageTitle?: string;
      pageDescription?: string;
      tabTheme?: string;
      tabSections?: string;
      tabPresets?: string;
      saveChanges?: string;
      saving?: string;
      saveSuccess?: string;
      saveFailed?: string;
      noChanges?: string;
      colorPalette?: string;
      palette?: string;
      customColors?: string;
      customColor?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      fontFamily?: string;
      borderRadius?: string;
      useTemplate?: string;
      chooseTemplate?: string;
      addSection?: string;
      removeSection?: string;
      moveUp?: string;
      moveDown?: string;
      toggleVisibility?: string;
      applyPreset?: string;
      presetConfirm?: string;
      loadingConfig?: string;
      emptyState?: string;
      sectionHero?: string;
      sectionHeroDesc?: string;
      sectionAnnouncement?: string;
      sectionAnnouncementDesc?: string;
      sectionFeatured?: string;
      sectionFeaturedDesc?: string;
      sectionProductGrid?: string;
      sectionProductGridDesc?: string;
      sectionTrustBadges?: string;
      sectionTrustBadgesDesc?: string;
      sectionAbout?: string;
      sectionAboutDesc?: string;
      sectionTestimonials?: string;
      sectionTestimonialsDesc?: string;
      sectionFaq?: string;
      sectionFaqDesc?: string;
      sectionCollections?: string;
      sectionCollectionsDesc?: string;
      sectionGallery?: string;
      sectionGalleryDesc?: string;
      sectionRichText?: string;
      sectionRichTextDesc?: string;
      sectionContact?: string;
      sectionContactDesc?: string;
      sectionVideo?: string;
      sectionVideoDesc?: string;
      sectionCountdown?: string;
      sectionCountdownDesc?: string;
      sectionStoreTabs?: string;
      sectionStoreTabsDesc?: string;
      defaultHeroTitle?: string;
      defaultHeroSubtitle?: string;
      defaultFeaturedTitle?: string;
      defaultAboutTitle?: string;
      defaultTestimonialsTitle?: string;
      defaultFaqTitle?: string;
      defaultCollectionsTitle?: string;
      defaultContactTitle?: string;
      defaultProductGridTitle?: string;
      heroDefaultTitle?: string;
      searchProducts?: string;
      noProductsMatch?: string;
      noProductsAvailable?: string;
      contactUsInfo?: string;
      contactEmail?: string;
      contactEmailPlaceholder?: string;
      contactPhone?: string;
      contactPhonePlaceholder?: string;
      contactWebsite?: string;
      contactWebsitePlaceholder?: string;
      contactSocial?: string;
      contactSocialPlaceholder?: string;
      testimonialsAutoMsg?: string;
      galleryPrev?: string;
      galleryNext?: string;
      galleryImage?: string;
      presetQuickStart?: string;
      presetMinimal?: string;
      presetMinimalDesc?: string;
      presetOcean?: string;
      presetOceanDesc?: string;
      presetForest?: string;
      presetForestDesc?: string;
      presetSunset?: string;
      presetSunsetDesc?: string;
      presetMidnight?: string;
      presetMidnightDesc?: string;
      presetEarth?: string;
      presetEarthDesc?: string;
      presetLavender?: string;
      presetLavenderDesc?: string;
      presetRose?: string;
      presetRoseDesc?: string;
      presetCurrentSections?: string;
      presetNewSections?: string;
      trustEscrow?: string;
      trustEscrowDesc?: string;
      trustCrypto?: string;
      trustCryptoDesc?: string;
      trustSelfHosted?: string;
      trustSelfHostedDesc?: string;
      trustP2p?: string;
      trustP2pDesc?: string;
      trustPrivacy?: string;
      trustPrivacyDesc?: string;
      reviewsPlaceholder?: string;
      collectionsEmpty?: string;
      collectionsLoading?: string;
      allSectionsAdded?: string;
      sectionCountLabel?: string;
      presetConfirmTitle?: string;
      presetConfirmMessage?: string;
      paletteOcean?: string;
      paletteForest?: string;
      paletteSunset?: string;
      paletteMidnight?: string;
      paletteMinimal?: string;
      paletteEarth?: string;
      paletteLavender?: string;
      paletteRose?: string;
      fieldTitle?: string;
      fieldSubtitle?: string;
      fieldCtaText?: string;
      fieldCtaLink?: string;
      fieldHeight?: string;
      fieldTextAlign?: string;
      fieldText?: string;
      fieldLink?: string;
      fieldDismissible?: string;
      fieldMode?: string;
      fieldCount?: string;
      fieldColumns?: string;
      fieldShowFilters?: string;
      fieldShowSearch?: string;
      fieldDefaultSort?: string;
      fieldImagePosition?: string;
      fieldShowContactInfo?: string;
      fieldLayout?: string;
      fieldStyle?: string;
      fieldEnableLightbox?: string;
      fieldHtmlContent?: string;
      fieldMaxWidth?: string;
      fieldCustomMessage?: string;
      fieldShowEmail?: string;
      fieldShowPhone?: string;
      fieldShowWebsite?: string;
      fieldShowSocial?: string;
      fieldQuestion?: string;
      fieldAnswer?: string;
      fieldAspectRatio?: string;
      fieldBackgroundImage?: string;
      fieldImage?: string;
      fieldVideoUrl?: string;
      fieldPosterImage?: string;
      fieldAutoplay?: string;
      fieldLoop?: string;
      fieldMuted?: string;
      fieldTargetDate?: string;
      fieldEndMessage?: string;
      fieldShowDays?: string;
      fieldShowHours?: string;
      fieldShowMinutes?: string;
      fieldShowSeconds?: string;
      countdownDays?: string;
      countdownHours?: string;
      countdownMinutes?: string;
      countdownSeconds?: string;
      countdownEnded?: string;
      videoDefaultTitle?: string;
      placeholderVideoUrl?: string;
      placeholderPosterImage?: string;
      placeholderEndMessage?: string;
      addFaqItem?: string;
      removeFaqItem?: string;
      badgesConfigured?: string;
      imagesCount?: string;
      optSmall?: string;
      optMedium?: string;
      optLarge?: string;
      optFullScreen?: string;
      optLeft?: string;
      optCenter?: string;
      optRight?: string;
      optNewest?: string;
      optPopular?: string;
      optManual?: string;
      optHorizontal?: string;
      optGrid?: string;
      optMinimal?: string;
      optCard?: string;
      optIllustrated?: string;
      optLatest?: string;
      optAllCollections?: string;
      optManualSelection?: string;
      optCarousel?: string;
      optSquare?: string;
      optAuto?: string;
      optPriceAsc?: string;
      optPriceDesc?: string;
      optName?: string;
      optColumns2?: string;
      optColumns3?: string;
      optColumns4?: string;
      optPill?: string;
      optSharp?: string;
      optFull?: string;
      aiGenerate?: string;
      aiBuilderTitle?: string;
      aiBuilderDesc?: string;
      brandNameLabel?: string;
      brandNamePlaceholder?: string;
      brandDescLabel?: string;
      brandDescPlaceholder?: string;
      generateWithAI?: string;
      generating?: string;
      regenerate?: string;
      applyDesign?: string;
      aiNotConfigured?: string;
      aiNotConfiguredDesc?: string;
      aiGenerateSuccess?: string;
      aiGenerateFailed?: string;
      aiRetry?: string;
      editAppearance?: string;
      resetClassicLayout?: string;
      resetClassicTitle?: string;
      resetClassicMessage?: string;
      resetClassicConfirm?: string;
    };
  };

  receivingAccounts?: {
    title?: string;
    subtitle?: string;
    addAccount?: string;
    editAccount?: string;
    name?: string;
    namePlaceholder?: string;
    chain?: string;
    address?: string;
    addressPlaceholder?: string;
    tokens?: string;
    active?: string;
    inactive?: string;
    confirmDelete?: string;
    confirmDeleteDesc?: string;
    noAccounts?: string;
    noAccountsDesc?: string;
    copyAddress?: string;
    addressCopied?: string;
    connectWallet?: string;
    useConnectedWallet?: string;
    invalidEvmAddress?: string;
    invalidSolAddress?: string;
    invalidUtxoAddress?: string;
  };

  saasHome?: {
    hero: {
      title: string;
      subtitle: string;
      ctaCreate: string;
      ctaExplore: string;
      welcomeBack: string;
      ctaDashboard: string;
      ctaViewStore: string;
      ctaStartSelling: string;
      ctaBrowse: string;
    };
    valueProps: {
      buyerProtection: { title: string; description: string };
      selfHosted: { title: string; description: string };
      lowFees: { title: string; description: string };
      cryptoNative: { title: string; description: string };
    };
    featuredStores: {
      title: string;
      subtitle: string;
      visitStore: string;
      products: string;
      viewAll: string;
      emptyTitle: string;
      emptySubtitle: string;
      growingCta: string;
    };
    networkActivity: {
      title: string;
      subtitle: string;
      fromStore: string;
    };
    stats: {
      activeStores: string;
      productsListed: string;
      chainsSupported: string;
    };
  };

  fiat?: {
    connectProvider?: string;
    cryptoBadge?: string;
    creditDebitCard?: string;
    paypal?: string;
    notConnected?: string;
    cryptoSection?: string;
    configureApiKeys?: string;
    disconnect?: string;
    saveFailed?: string;
    orPayWithCrypto?: string;
    protectedBy?: string;
    sectionTitle?: string;
    connected?: string;
    payAmount?: string;
    processing?: string;
    confirming?: string;
    success?: string;
    failed?: string;
    cancelled?: string;
    retry?: string;
    switchToCrypto?: string;
    sdkLoadFailed?: string;
    sdkLoadFailedHint?: string;
    confirmingWithPaypal?: string;
    paymentBeingConfirmed?: string;
    providerNotAvailable?: string;
    acceptedPayments?: string;
    deleteFailed?: string;
    genericError?: string;
    payNow?: string;
    stripeLoadFailed?: string;
    captureFailed?: string;
    email?: string;
    accountId?: string;
    accountStatus?: string;
    charges?: string;
    payouts?: string;
    enabled?: string;
    disabled?: string;
    pendingRequirements?: string;
    manageDashboard?: string;
    dashboardLoginHint?: string;
  };
  store?: TranslationSection & {
    offlineBanner?: string;
    offlinePriceDisclaimer?: string;
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
