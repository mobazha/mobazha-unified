---
name: i18n-guide
description: Guide for internationalization development in Mobazha including translation key naming, adding new languages, parameter interpolation, and locale-specific formatting. Use when adding translations, creating i18n keys, or working with multi-language features, "国际化", "多语言", "翻译", "i18n", "本地化", "添加翻译".
---

# 国际化开发指南

Mobazha 项目的多语言开发规范，支持 9 种语言。

## 技术架构

```
packages/core/i18n/
├── i18n.ts       # 核心实现：getTranslation(), setLocale(), formatDate()
├── types.ts      # TranslationKey, TranslationParams 类型
├── index.ts      # 统一导出
└── locales/
    ├── en.ts     # 英语（主语言，所有 key 必须先在此定义）
    ├── zh.ts     # 中文
    ├── ja.ts     # 日语
    ├── ko.ts     # 韩语
    ├── es.ts     # 西班牙语
    ├── fr.ts     # 法语
    ├── de.ts     # 德语
    ├── ru.ts     # 俄语
    ├── pt.ts     # 葡萄牙语
    └── index.ts  # 统一导出
```

## 使用方式

### useI18n Hook

```typescript
import { useI18n } from '@mobazha/core';

function MyComponent() {
  const { t, locale, setLocale, formatDate, formatNumber } = useI18n();

  return (
    <div>
      <h1>{t('order.title')}</h1>
      <p>{t('order.itemCount', { count: 5 })}</p>
      <p>{formatDate(new Date())}</p>
      <p>{formatNumber(1234.56)}</p>
    </div>
  );
}
```

### 参数插值

使用 `{{参数名}}` 语法：

```typescript
// en.ts
order: {
  itemCount: '{{count}} items in your order',
  greeting: 'Hello, {{name}}!',
}

// 使用
t('order.itemCount', { count: 3 })  // "3 items in your order"
t('order.greeting', { name: 'Alice' })  // "Hello, Alice!"
```

## 翻译 Key 命名规范

### 层级结构

```
模块.功能.描述
```

### 命名规则

| 规则     | 示例                                              | 说明               |
| -------- | ------------------------------------------------- | ------------------ |
| 模块名   | `order`, `wallet`, `settings`, `chat`             | 对应功能模块       |
| 通用词汇 | `common.loading`, `common.error`, `common.cancel` | `common` 前缀      |
| 导航     | `nav.home`, `nav.orders`, `nav.wallet`            | `nav` 前缀         |
| 按钮     | `order.submit`, `cart.checkout`                   | 动词形式           |
| 标题     | `settings.general.title`                          | `title` 后缀       |
| 占位符   | `search.placeholder`                              | `placeholder` 后缀 |
| 错误消息 | `order.error.notFound`                            | `error` 层级       |
| 状态     | `order.status.completed`                          | `status` 层级      |

### 示例对照

```typescript
// ✅ 好的命名
'common.loading'; // 通用加载
'common.noItems'; // 通用空状态
'order.status.completed'; // 订单状态
'wallet.send.confirm'; // 钱包发送确认
'settings.general.language'; // 设置-通用-语言
'product.price.from'; // 商品价格起始

// ❌ 差的命名
'loading'; // 缺少模块前缀
'orderCompleted'; // 没有用点分隔
'settings_language'; // 用了下划线而不是点
'btn_submit'; // 不要用缩写前缀
```

## 添加新翻译的流程

### 第一步：在 en.ts 中添加

```typescript
// packages/core/i18n/locales/en.ts
export const en = {
  // ... 已有内容
  shipping: {
    // ... 已有内容
    newFeature: {
      title: 'New Feature Title',
      description: 'Description of the new feature',
    },
  },
};
```

### 第二步：更新类型（自动推断）

如果 `TranslationKey` 是从 `en.ts` 自动推断的，无需手动更新类型。
否则需要在 `types.ts` 中添加新 key。

### 第三步：添加其他语言

```typescript
// packages/core/i18n/locales/zh.ts
shipping: {
  newFeature: {
    title: '新功能标题',
    description: '新功能描述',
  },
},
```

**优先级**：先完成 `en.ts` 和 `zh.ts`，其他语言可后续补充。

## 特殊场景处理

### 日期格式化

```typescript
const { formatDate } = useI18n();

// 使用 locale-aware 格式化
formatDate(new Date('2024-01-15'));
// en: "January 15, 2024"
// zh: "2024年1月15日"
```

### 数字格式化

```typescript
const { formatNumber } = useI18n();

formatNumber(1234567.89);
// en: "1,234,567.89"
// de: "1.234.567,89"
```

### 货币金额

**不要**用 i18n 处理货币，使用 `useCurrency()` hook：

```typescript
import { useCurrency } from '@mobazha/core';

const { formatPrice, renderPairedPrice } = useCurrency();
formatPrice(amount, 'BTC'); // 正确的货币格式化
```

### 条件文本

```typescript
// ❌ 禁止用语言判断
{
  lang === 'zh' ? '中文文本' : 'English text';
}

// ✅ 用同一个 key，不同 locale 文件提供不同翻译
{
  t('feature.description');
}
```

## 快速检查清单

- [ ] 新增的用户可见文本是否都使用了 `t()` ？
- [ ] 翻译 key 是否遵循 `模块.功能.描述` 格式？
- [ ] 是否在 `en.ts` 中先添加了新 key？
- [ ] 动态内容是否使用 `{{参数}}` 插值？
- [ ] 货币金额是否使用 `useCurrency()` 而非 `t()`？
- [ ] 日期是否使用 `formatDate()` 而非硬编码格式？

## 相关功能文档

- **[国际化系统](../../docs/features/i18n.md)** — useI18n 完整 API、9 种语言列表、翻译键结构、新语言添加流程
