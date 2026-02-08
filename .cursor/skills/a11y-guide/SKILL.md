---
name: a11y-guide
description: Accessibility guide for Mobazha following WCAG 2.1 AA standards including color contrast, reduced motion, ARIA patterns, keyboard navigation, focus management, and screen reader testing. Use when building accessible components or reviewing accessibility, "无障碍", "可访问性", "a11y", "ARIA", "键盘导航", "屏幕阅读器", "对比度".
---

# 无障碍设计规范

Mobazha 项目的 WCAG 2.1 AA 无障碍标准和最佳实践。

## 一、色彩对比度

### WCAG AA 最低要求

| 内容类型                          | 最低对比度 | 说明                       |
| --------------------------------- | ---------- | -------------------------- |
| 正文（< 18px）                    | **4.5:1**  | 正文、描述、标签           |
| 大文字（>= 18px bold 或 >= 24px） | **3:1**    | 标题、大号文字             |
| UI 控件和图形                     | **3:1**    | 按钮边框、图标、输入框边框 |
| 装饰性元素                        | 无要求     | 纯装饰、已禁用控件         |

### 项目注意事项

```tsx
// ✅ 好：muted-foreground 在大多数主题下对比度足够
<p className="text-muted-foreground">辅助文字</p>

// ⚠️ 注意：透明度过低可能不满足对比度
<p className="text-muted-foreground/50">这可能对比度不够</p>
// → 改为 text-muted-foreground/70 或测试实际对比度

// ❌ 差：浅色背景上的浅色文字
<p className="text-primary/30">这几乎看不清</p>
```

### 验证工具

- 浏览器 DevTools → Accessibility 面板 → 对比度比率
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- axe DevTools 扩展（自动检测）

## 二、媒体查询适配

### prefers-reduced-motion（必须支持）

```tsx
// Tailwind 方式
<div className="animate-fade-in motion-reduce:animate-none">
<button className="transition-all duration-200 motion-reduce:transition-none">

// CSS 全局降级（globals.css 中添加）
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**例外**：加载指示器（spinner）不需要降级，因为是功能性动画。

### prefers-color-scheme

项目已通过主题系统的 `system` 模式支持，无需额外处理。

## 三、ARIA 模式速查

### Dialog（已由 Radix 处理）

```tsx
// Radix Dialog 自动处理：
// - role="dialog"
// - aria-modal="true"
// - 焦点陷阱
// - Escape 关闭
// 需要手动确保：
<DialogTitle>标题必须存在</DialogTitle>
<DialogDescription className="sr-only">
  无视觉描述时用 sr-only 隐藏
</DialogDescription>
```

### Tabs

```tsx
// Radix Tabs 自动处理 role="tablist" / "tab" / "tabpanel"
// 键盘：Arrow 切换、Enter/Space 选择
```

### Alert / Toast

```tsx
// 重要通知
<div role="alert" aria-live="assertive">
  操作失败：网络错误
</div>

// 非紧急通知
<div role="status" aria-live="polite">
  已添加到购物车
</div>
```

### 图标按钮

```tsx
// ✅ 必须有 aria-label
<button aria-label="关闭" onClick={onClose}>
  <X className="w-4 h-4" />
</button>

// ✅ 或使用 sr-only
<button onClick={onClose}>
  <X className="w-4 h-4" />
  <span className="sr-only">关闭</span>
</button>
```

### 图片

```tsx
// 有信息量的图片
<img alt="红色运动鞋侧面图" src="..." />

// 纯装饰图片
<img alt="" role="presentation" src="..." />
```

## 四、键盘导航

### 基本要求

- 所有交互元素必须可通过 Tab 聚焦
- 可见的焦点指示器：

```tsx
<button className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
<input className="focus:ring-2 focus:ring-primary focus:border-primary">
```

- 自定义可点击元素（非 `<button>`/`<a>`）必须添加 `role` 和 `tabIndex`：

```tsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
```

### 焦点管理

| 场景        | 操作                                                 |
| ----------- | ---------------------------------------------------- |
| Dialog 打开 | 焦点移到 Dialog 内第一个可聚焦元素（Radix 自动处理） |
| Dialog 关闭 | 焦点返回触发元素（Radix 自动处理）                   |
| 路由切换    | 焦点移到页面主内容区域（需手动处理）                 |
| 元素删除    | 焦点移到前一个或后一个元素                           |
| Toast 出现  | 不抢夺焦点（aria-live 通知即可）                     |

### SPA 路由切换焦点管理

```tsx
// 在 layout 或路由变化时
useEffect(() => {
  // 将焦点移到主内容区域
  const main = document.getElementById('main-content');
  if (main) {
    main.focus({ preventScroll: true });
  }
}, [pathname]);

// 主内容区域
<main id="main-content" tabIndex={-1} className="outline-none">
  {children}
</main>;
```

### 跳转链接（Skip Navigation）

```tsx
// 放在 <body> 最前面
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
>
  跳转到主内容
</a>
```

## 五、屏幕阅读器

### 隐藏视觉元素

```tsx
// 仅屏幕阅读器可见
<span className="sr-only">购物车中有 3 件商品</span>

// 对屏幕阅读器隐藏（纯装饰）
<div aria-hidden="true">🎉</div>
```

### 动态内容更新

```tsx
// 购物车数量变化
<span aria-live="polite" className="sr-only">
  购物车已更新，当前 {count} 件商品
</span>

// 加载状态
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? '加载中...' : content}
</div>
```

## 六、测试

### 手动测试清单

- [ ] 仅用键盘操作完整流程（Tab/Shift+Tab/Enter/Escape/Arrow）
- [ ] 所有交互元素有可见的焦点指示器
- [ ] 所有图标按钮有文本描述（aria-label 或 sr-only）
- [ ] 所有图片有 alt 文本（装饰图片 alt=""）
- [ ] Dialog 打开/关闭焦点管理正确
- [ ] 在系统设置中开启减少动效，确认动画降级
- [ ] 文字放大到 200%，布局不破碎

### 自动化测试（推荐集成）

```typescript
// Playwright a11y 测试
import AxeBuilder from '@axe-core/playwright';

test('首页无障碍检查', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

  expect(results.violations).toEqual([]);
});
```

```bash
# 安装
pnpm --filter @mobazha/web add -D @axe-core/playwright
```

## 快速检查清单

- [ ] 色彩对比度是否满足 WCAG AA（正文 4.5:1，大文字 3:1）？
- [ ] 动画是否添加 `motion-reduce:` 降级？
- [ ] 图标按钮是否有 `aria-label` 或 `sr-only` 文本？
- [ ] 表单输入是否有关联的 `<label>` 或 `aria-label`？
- [ ] 焦点指示器是否可见（`focus-visible:ring-2`）？
- [ ] 自定义可点击元素是否有 `role="button"` 和键盘事件？
- [ ] 动态内容更新是否有 `aria-live` 通知？
