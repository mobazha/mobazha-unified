# 主题合规审计（Theme Compliance Audit）

## 触发条件

当用户提到以下内容时使用：

- "主题审计"、"theme audit"、"检查主题合规"
- "检查硬编码颜色"、"hardcoded colors"
- "主题切换后颜色不对"、"暗色模式样式问题"
- "全局 UI 检查"、"样式一致性检查"

## 概述

系统化的主题合规检查流程，检测并修复不符合主题变量规范的硬编码颜色。

## 第一步：自动化检测

### 1.1 检测硬编码颜色

```bash
# 检测所有违规文件（排除 node_modules、.next）
rg -c "text-(slate|gray|zinc|neutral|stone|emerald|green|teal|blue|indigo|violet|purple|pink|red|orange|amber|yellow|lime|cyan|sky|fuchsia|rose)-[0-9]" apps/web/src/ --type tsx --type ts | sort -t: -k2 -rn

# 检测背景色违规
rg -c "bg-(slate|gray|zinc|neutral|stone|emerald|green|teal|blue|indigo|violet|purple|pink|red|orange|amber|yellow|lime|cyan|sky|fuchsia|rose)-[0-9]" apps/web/src/ --type tsx --type ts | sort -t: -k2 -rn

# 检测边框色违规
rg -c "border-(slate|gray|zinc|neutral|stone|emerald|green|teal|blue|indigo|violet|purple|pink|red|orange|amber|yellow|lime|cyan|sky|fuchsia|rose)-[0-9]" apps/web/src/ --type tsx --type ts | sort -t: -k2 -rn
```

### 1.2 Hero 区域品牌变量检查

```bash
# Hero 区域不应有硬编码颜色（除 text-white）
rg "(emerald|slate|teal|cyan|green|blue|purple|pink|amber)-[0-9]" apps/web/src/components/Hero/
```

## 第二步：修复映射表

### 文字颜色映射

| 硬编码                            | 替换为                           | 说明      |
| --------------------------------- | -------------------------------- | --------- |
| `text-gray-900`, `text-slate-900` | `text-foreground`                | 主要文字  |
| `text-gray-700`, `text-slate-700` | `text-foreground`                | 主要文字  |
| `text-gray-600`, `text-slate-600` | `text-muted-foreground`          | 次要文字  |
| `text-gray-500`, `text-slate-500` | `text-muted-foreground`          | 次要文字  |
| `text-gray-400`, `text-slate-400` | `text-muted-foreground/70`       | 辅助文字  |
| `text-gray-300`                   | `text-muted-foreground/50`       | 淡化文字  |
| `text-emerald-*`, `text-green-*`  | `text-primary` 或 `text-success` | 根据语义  |
| `text-blue-*`                     | `text-info` 或 `text-primary`    | 根据语义  |
| `text-red-*`                      | `text-destructive`               | 错误/删除 |

### 背景颜色映射

| 硬编码                           | 替换为                           | 说明             |
| -------------------------------- | -------------------------------- | ---------------- |
| `bg-gray-100`, `bg-slate-100`    | `bg-muted`                       | 次要背景         |
| `bg-gray-200`, `bg-slate-200`    | `bg-muted`                       | 次要背景         |
| `bg-gray-50`, `bg-slate-50`      | `bg-background` 或 `bg-muted/50` | 浅背景           |
| `bg-gray-800`, `bg-slate-800`    | `bg-card` 或 `bg-muted`          | 暗色模式背景     |
| `bg-gray-900`, `bg-slate-900`    | `bg-background`                  | 暗色模式页面背景 |
| `bg-green-500`, `bg-emerald-500` | `bg-success` 或 `bg-primary`     | 根据语义         |
| `bg-blue-500`                    | `bg-info` 或 `bg-primary`        | 根据语义         |
| `bg-red-500`                     | `bg-destructive`                 | 错误/删除        |

### 边框颜色映射

| 硬编码                            | 替换为           |
| --------------------------------- | ---------------- |
| `border-gray-*`, `border-slate-*` | `border-border`  |
| `border-emerald-*`                | `border-primary` |

### 允许的例外

- `text-white` / `text-black`：在已知深/浅色背景上
- `bg-amber-*` + `dark:bg-amber-*`：警告框（需配对）
- `text-amber-500`：星级评分
- `bg-white/*`：毛玻璃效果

## 第三步：多主题验证清单

修复后，需在以下组合下验证视觉效果：

### 主题 x 模式矩阵（12 种组合）

|           | Light | Dark |
| --------- | ----- | ---- |
| Classic   | 检查  | 检查 |
| Crypto    | 检查  | 检查 |
| Business  | 检查  | 检查 |
| Cyberpunk | 检查  | 检查 |
| Nature    | 检查  | 检查 |
| Luxury    | 检查  | 检查 |

### 关键检查页面

1. 首页（Hero 区域）
2. 商品详情页
3. 店铺页面
4. 购物车 / 结账
5. 订单列表 / 详情
6. 设置页面

### 检查要点

- [ ] 文字在所有主题下可读（对比度足够）
- [ ] 卡片/容器边框在浅色和深色模式下都可见
- [ ] 状态色（成功/错误/警告）在所有主题下语义清晰
- [ ] Hero 渐变在每套主题下都有独特的视觉表达
- [ ] 按钮 hover/active 状态在所有主题下有反馈

## 第四步：输出报告

```markdown
## 主题合规审计报告

**审计日期**: YYYY-MM-DD
**审计范围**: apps/web/src/

### 违规统计

- 文字颜色违规: X 处（Y 个文件）
- 背景颜色违规: X 处（Y 个文件）
- 边框颜色违规: X 处（Y 个文件）

### 修复进度

- [x] 已修复: file1.tsx (3处)
- [x] 已修复: file2.tsx (5处)
- [ ] 待修复: file3.tsx (2处)

### 验证状态

- [x] Classic Light/Dark
- [x] Crypto Light/Dark
- [ ] ...其余主题
```
