# 主题系统 (Theme System)

## 功能 ID

`FEAT-THEME-SYSTEM-001`

## 功能描述

Mobazha 多主题系统支持 6 种预设主题和 3 种显示模式（亮色/暗色/跟随系统），为用户提供个性化的视觉体验。

## 主题列表

| 主题名称   | Theme Name     | 风格描述                         |
| ---------- | -------------- | -------------------------------- |
| 经典青色   | Classic Cyan   | 默认主题，清新专业的青色调       |
| 加密之夜   | Crypto Night   | 深色背景配荧光绿，区块链交易风格 |
| 商务蓝     | Business Blue  | 稳重专业的蓝色系，适合商业场景   |
| 赛博朋克粉 | Cyberpunk Pink | 紫色与粉色渐变，科幻未来风       |
| 自然绿     | Nature Green   | 温暖的大地色调，自然舒适         |
| 奢华金     | Luxury Gold    | 金色与黑色，奢华高端感           |

## 显示模式

- **Light** - 浅色模式
- **Dark** - 深色模式
- **System** - 跟随系统设置自动切换

## 技术实现

### 核心模块

```
packages/core/theme/
├── types.ts      # 类型定义
├── themes.ts     # 主题配置
├── useTheme.ts   # React Hook
└── index.ts      # 导出
```

### 类型定义

```typescript
// 显示模式
type ThemeMode = 'light' | 'dark' | 'system';

// 主题名称
type ThemeName = 'classic' | 'crypto' | 'business' | 'cyberpunk' | 'nature' | 'luxury';

// 主题颜色
interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  // ... 更多颜色
}
```

### 使用方法

#### 1. 在组件中使用 Hook

```tsx
import { useTheme } from '@mobazha/core/theme';

function MyComponent() {
  const { theme, mode, setTheme, setMode, isDark } = useTheme();

  return (
    <div>
      <p>当前主题: {theme}</p>
      <p>当前模式: {mode}</p>
      <button onClick={() => setTheme('crypto')}>切换到 Crypto 主题</button>
      <button onClick={() => setMode(isDark ? 'light' : 'dark')}>切换亮/暗模式</button>
    </div>
  );
}
```

#### 2. 使用 CSS 变量

所有颜色通过 CSS 变量定义，在样式中直接使用：

```css
.my-element {
  background-color: var(--color-background);
  color: var(--color-textPrimary);
  border-color: var(--color-border);
}
```

或使用 Tailwind 语义化类名：

```jsx
<div className="bg-background text-textPrimary border-borderLight">内容</div>
```

### CSS 变量列表

| 变量名                  | Tailwind 类                      | 用途          |
| ----------------------- | -------------------------------- | ------------- |
| `--color-primary`       | `text-primary`, `bg-primary`     | 主色调        |
| `--color-secondary`     | `text-secondary`, `bg-secondary` | 辅色调        |
| `--color-accent`        | `text-accent`, `bg-accent`       | 强调色        |
| `--color-background`    | `bg-background`                  | 页面背景      |
| `--color-backgroundAlt` | `bg-backgroundAlt`               | 交替背景      |
| `--color-surface`       | `bg-surface`                     | 表面/卡片背景 |
| `--color-surfaceHover`  | `bg-surfaceHover`                | 悬停状态      |
| `--color-textPrimary`   | `text-textPrimary`               | 主要文字      |
| `--color-textSecondary` | `text-textSecondary`             | 次要文字      |
| `--color-textMuted`     | `text-textMuted`                 | 弱化文字      |
| `--color-textInverse`   | `text-textInverse`               | 反色文字      |
| `--color-border`        | `border-border`                  | 边框          |
| `--color-borderLight`   | `border-borderLight`             | 浅边框        |
| `--color-success`       | `text-success`, `bg-success`     | 成功状态      |
| `--color-warning`       | `text-warning`, `bg-warning`     | 警告状态      |
| `--color-error`         | `text-error`, `bg-error`         | 错误状态      |
| `--color-info`          | `text-info`, `bg-info`           | 信息提示      |

### 配置文件

#### Tailwind 配置

```javascript
// apps/web/tailwind.config.ts
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        background: 'var(--color-background)',
        // ... 其他颜色
      },
    },
  },
};
```

#### 全局样式

```css
/* apps/web/src/app/globals.css */
:root {
  --color-primary: #00bcd4;
  --color-background: #ffffff;
  /* ... 默认主题颜色 */
}

.dark {
  --color-primary: #26c6da;
  --color-background: #0f172a;
  /* ... 暗色模式颜色 */
}

[data-theme='crypto'] {
  --color-primary: #00d26a;
  /* ... Crypto 主题颜色 */
}

[data-theme='crypto'].dark {
  --color-primary: #00ff85;
  /* ... Crypto 暗色模式颜色 */
}
```

## 本地存储

主题设置自动保存到 `localStorage`：

```javascript
// 存储 key: 'mobazha-theme'
// 存储格式:
{
  "name": "crypto",
  "mode": "dark"
}
```

## 防闪烁处理

在 `layout.tsx` 中添加了内联脚本，在页面渲染前同步读取主题设置并应用，避免页面闪烁：

```typescript
const setInitialTheme = `
  (function() {
    const persistedTheme = localStorage.getItem('mobazha-theme');
    if (persistedTheme) {
      const { name, mode } = JSON.parse(persistedTheme);
      document.documentElement.setAttribute('data-theme', name);
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  })();
`;
```

## 国际化支持

主题名称支持 9 种语言翻译：

- 英语 (English)
- 简体中文 (Chinese)
- 日语 (Japanese)
- 韩语 (Korean)
- 西班牙语 (Spanish)
- 法语 (French)
- 德语 (German)
- 俄语 (Russian)
- 葡萄牙语 (Portuguese)

## 组件

### ThemeProvider

提供主题上下文，需要包裹在应用根部：

```tsx
import { ThemeProvider } from '@/components';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

### ThemeSwitcher

主题切换下拉菜单组件：

```tsx
import { ThemeSwitcher } from '@/components';

function Header() {
  return (
    <header>
      <ThemeSwitcher />
    </header>
  );
}
```

## 迁移检查清单

- [x] 核心模块实现 (types.ts, themes.ts, useTheme.ts)
- [x] Tailwind 配置更新
- [x] 全局 CSS 变量定义
- [x] ThemeProvider 组件
- [x] ThemeSwitcher 组件
- [x] 防闪烁脚本
- [x] 9 种语言翻译
- [x] 所有 UI 组件适配
- [x] 所有页面适配
- [x] localStorage 持久化
- [x] 跟随系统设置

## 相关文档

- [国际化系统](./i18n.md)
- [迁移状态](../migrations/status.md)
