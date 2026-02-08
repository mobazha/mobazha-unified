---
name: ecommerce-ux
description: E-commerce UX patterns for Mobazha decentralized marketplace including search experience, product browsing, cart interactions, checkout flow, order tracking, and review system. Use when building shopping features, checkout flows, or product pages, "电商", "购物", "搜索", "商品", "购物车", "结账", "订单跟踪", "评价".
---

# 电商 UX 模式

Mobazha 去中心化市场的核心购物体验规范。

## 一、搜索体验

### 搜索输入

```tsx
// 即时搜索：输入 debounce 300ms 后自动搜索
<SearchInput
  placeholder={t('search.placeholder')}
  inputMode="search"
  enterKeyHint="search"
  aria-label={t('search.label')}
/>
```

### 搜索结果 UX

| 状态              | 展示                              |
| ----------------- | --------------------------------- |
| 输入中（< 2字符） | 最近搜索 + 热门搜索               |
| 搜索中            | 骨架屏（ProductGridSkeleton）     |
| 有结果            | 商品网格 + 结果数量 + 筛选/排序   |
| 无结果            | NoSearchResults 空状态 + 搜索建议 |
| 错误              | LoadError + 重试按钮              |

### 筛选面板

- 移动端：底部 Sheet（`FilterSheet`，高度 85vh）
- 桌面端：侧边栏或 Popover
- 筛选变化后即时刷新结果
- 显示已激活筛选数量的 badge

### 排序

常用排序选项：

- 相关性（默认）
- 价格 低→高 / 高→低
- 最新上架
- 评价最高

## 二、商品浏览

### 商品卡片（ProductCard）

| 元素     | 移动端                       | 桌面端                                   |
| -------- | ---------------------------- | ---------------------------------------- |
| 布局     | 2 列网格                     | 4-5 列网格                               |
| 图片     | 1:1 比例                     | 1:1 比例                                 |
| 标题     | 最多 2 行截断                | 最多 2 行截断                            |
| 价格     | `text-primary font-semibold` | 同左                                     |
| 店铺头像 | 隐藏（compact）              | 显示                                     |
| Hover    | `active:scale-[0.98]`        | `hover:shadow-lg hover:-translate-y-0.5` |

### 商品详情页

**图片画廊**：

- 主图大图展示（1:1 或 4:3）
- 缩略图列表可滚动
- 移动端：左右滑动切换 + 指示点
- 桌面端：点击缩略图切换 + 悬停缩放

**价格展示**：

```tsx
// 标准价格
<span className="text-primary text-lg font-semibold">
  {formatPrice(price, currency)}
</span>

// 配对价格（加密货币 + 法币）
<div>
  <span className="text-primary font-semibold">{cryptoPrice}</span>
  <span className="text-muted-foreground text-sm ml-1">({fiatPrice})</span>
</div>
```

**关键操作区**：

- 移动端：固定底栏（`ProductBottomBar`）包含"加入购物车"和"立即购买"
- 桌面端：右侧固定区域

### 变体选择器

```tsx
// 颜色/尺寸等变体
<div className="flex flex-wrap gap-2">
  {variants.map(v => (
    <button
      key={v.id}
      className={cn(
        'px-3 py-1.5 rounded-lg border text-sm transition-colors',
        selected === v.id
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border hover:border-primary/50'
      )}
    >
      {v.label}
    </button>
  ))}
</div>
```

## 三、购物车体验

### 添加到购物车

- 操作后显示 success toast
- 底部导航的购物车图标 badge 数字更新
- 可选：商品飞入购物车的微动画

### 购物车页面

| 功能     | 实现                                              |
| -------- | ------------------------------------------------- |
| 数量调整 | 加减按钮，最小触摸目标 44px                       |
| 删除商品 | 滑动删除（移动端）或 hover 显示删除按钮（桌面端） |
| 小计     | 实时计算，使用 BigNumber                          |
| 跨店商品 | 按店铺分组显示                                    |
| 空购物车 | EmptyCart 空状态 + 去逛逛按钮                     |

### 价格展示一致性

- 所有价格使用 `useCurrency()` hook 格式化
- 加密货币显示精度：遵循 `currencyService` 配置
- 法币配对价格紧跟加密货币价格

## 四、结账流程

### 步骤指示器

```
地址选择 → 支付方式 → 确认订单 → 支付
```

```tsx
<div className="flex items-center justify-between">
  {steps.map((step, i) => (
    <div key={step.id} className="flex items-center">
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm',
          i <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
      </div>
      {i < steps.length - 1 && (
        <div className={cn('h-0.5 w-8 mx-2', i < currentStep ? 'bg-primary' : 'bg-muted')} />
      )}
    </div>
  ))}
</div>
```

### 地址选择

- 已保存地址列表可快速选择
- "新增地址"打开 AddressFormModal
- 默认地址自动预选

### 支付确认

- 明确显示总金额（加密货币 + 法币等价）
- 显示 Escrow 说明（买家保护）
- 仲裁员信息可查看
- 移动端：固定底栏显示"确认支付"按钮

### 错误恢复

| 错误场景   | 处理                    |
| ---------- | ----------------------- |
| 网络断线   | 保留表单数据，提示重试  |
| 余额不足   | 显示所需金额，引导充值  |
| 钱包未连接 | 引导连接钱包            |
| 交易失败   | 显示错误原因 + 重试按钮 |

## 五、订单跟踪

### 状态时间线

```tsx
<div className="space-y-4">
  {timeline.map((event, i) => (
    <div key={i} className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn('w-3 h-3 rounded-full', event.completed ? 'bg-primary' : 'bg-muted')} />
        {i < timeline.length - 1 && (
          <div className={cn('w-0.5 flex-1 mt-1', event.completed ? 'bg-primary' : 'bg-muted')} />
        )}
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium">{event.title}</p>
        <p className="text-xs text-muted-foreground">{event.time}</p>
      </div>
    </div>
  ))}
</div>
```

### Escrow 状态可视化

| 状态     | 图标 | 颜色               | 说明             |
| -------- | ---- | ------------------ | ---------------- |
| Funded   | 🔒   | `text-info`        | 资金已锁定       |
| Released | ✅   | `text-success`     | 资金已释放给卖家 |
| Refunded | ↩️   | `text-warning`     | 已退款给买家     |
| Disputed | ⚠️   | `text-destructive` | 争议处理中       |

## 六、评价系统

### 星级评分展示

```tsx
// 只读展示
<div className="flex items-center gap-1">
  {[1, 2, 3, 4, 5].map(star => (
    <Star
      key={star}
      className={cn(
        'w-4 h-4',
        star <= rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'
      )}
    />
  ))}
  <span className="text-sm text-muted-foreground ml-1">({reviewCount})</span>
</div>
```

### 评价列表

- 按时间倒序（默认）或评分排序
- 显示买家头像、名称、评分、评论内容、时间
- 长评论展开/收起

## 快速检查清单

- [ ] 搜索输入是否有 debounce（300ms）？
- [ ] 空搜索结果是否有引导操作？
- [ ] 商品价格是否使用 `useCurrency()` 格式化？
- [ ] 购物车数量调整是否有 44px 触摸目标？
- [ ] 结账流程是否有步骤指示？
- [ ] 支付错误是否有明确的恢复路径？
- [ ] 订单状态是否有时间线展示？
- [ ] 移动端关键操作是否在底部固定栏？
