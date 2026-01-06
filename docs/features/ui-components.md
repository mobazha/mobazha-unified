# UI 组件库使用指南

## 概述

项目使用两套 UI 组件库：

1. **`@mobazha/ui`** - 自定义业务组件 (ProductCard, Avatar, Grid 等)
2. **`@/components/ui`** - shadcn/ui 组件 (Dialog, Select, Toast 等)

## shadcn/ui 组件

### 安装位置

所有 shadcn/ui 组件位于 `apps/web/src/components/ui/` 目录下。

### 可用组件

| 组件           | 用途       | 导入方式                                                                     |
| -------------- | ---------- | ---------------------------------------------------------------------------- |
| `Button`       | 按钮       | `import { Button } from '@/components/ui'`                                   |
| `Dialog`       | 模态对话框 | `import { Dialog, DialogContent, ... } from '@/components/ui'`               |
| `AlertDialog`  | 确认对话框 | `import { AlertDialog, AlertDialogContent, ... } from '@/components/ui'`     |
| `Select`       | 下拉选择器 | `import { Select, SelectContent, SelectItem, ... } from '@/components/ui'`   |
| `Switch`       | 开关切换   | `import { Switch } from '@/components/ui'`                                   |
| `Input`        | 输入框     | `import { Input } from '@/components/ui'`                                    |
| `Textarea`     | 多行文本框 | `import { Textarea } from '@/components/ui'`                                 |
| `Checkbox`     | 复选框     | `import { Checkbox } from '@/components/ui'`                                 |
| `Label`        | 标签       | `import { Label } from '@/components/ui'`                                    |
| `Tabs`         | 标签页     | `import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'` |
| `Tooltip`      | 工具提示   | `import { Tooltip, TooltipContent, ... } from '@/components/ui'`             |
| `Popover`      | 弹出框     | `import { Popover, PopoverContent, ... } from '@/components/ui'`             |
| `DropdownMenu` | 下拉菜单   | `import { DropdownMenu, DropdownMenuContent, ... } from '@/components/ui'`   |
| `ScrollArea`   | 滚动区域   | `import { ScrollArea } from '@/components/ui'`                               |
| `Separator`    | 分隔线     | `import { Separator } from '@/components/ui'`                                |
| `Badge`        | 徽章       | `import { Badge } from '@/components/ui'`                                    |
| `Card`         | 卡片       | `import { Card, CardContent, CardHeader, ... } from '@/components/ui'`       |
| `Avatar`       | 头像       | `import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui'`      |
| `Accordion`    | 手风琴     | `import { Accordion, AccordionItem, ... } from '@/components/ui'`            |
| `Toast`        | 消息通知   | `import { useToast } from '@/components/ui'`                                 |

### 统一导入

所有组件已从 `@/components/ui/index.ts` 导出，可以一次性导入：

```tsx
import {
  Button,
  Dialog,
  DialogContent,
  Select,
  SelectContent,
  SelectItem,
  Switch,
  useToast,
} from '@/components/ui';
```

## 使用示例

### Select 下拉选择器

**替代原生 `<select>` 元素：**

```tsx
// ❌ 原生 select
<select value={value} onChange={e => setValue(e.target.value)}>
  <option value="">Select...</option>
  <option value="option1">Option 1</option>
</select>

// ✅ shadcn Select
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### Switch 开关

**替代手写 Toggle：**

```tsx
// ❌ 手写 Toggle
<button
  onClick={() => onChange(!value)}
  className={`relative w-12 h-6 rounded-full ${value ? 'bg-emerald-500' : 'bg-slate-300'}`}
>
  <span className={`absolute w-5 h-5 bg-white rounded-full ${value ? 'translate-x-6' : ''}`} />
</button>

// ✅ shadcn Switch
<Switch checked={value} onCheckedChange={onChange} />
```

### Dialog 模态对话框

**替代自定义 Modal：**

```tsx
// ❌ 手写 Modal
{
  showModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6">
        <h2>Title</h2>
        <button onClick={() => setShowModal(false)}>Close</button>
      </div>
    </div>
  );
}

// ✅ shadcn Dialog
<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>;
```

### AlertDialog 确认对话框

**替代 `confirm()` 调用：**

```tsx
// ❌ 原生 confirm
const handleDelete = () => {
  if (confirm('Are you sure?')) {
    deleteItem();
  }
};

// ✅ shadcn AlertDialog
const [showConfirm, setShowConfirm] = useState(false);

<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={deleteItem}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>;
```

### Toast 消息通知

**替代 `alert()` 调用：**

```tsx
// ❌ 原生 alert
alert('Success!');

// ✅ shadcn Toast
import { useToast } from '@/components/ui';

function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: 'Success',
      description: 'Operation completed successfully!',
    });
  };

  const handleError = () => {
    toast({
      title: 'Error',
      description: 'Something went wrong.',
      variant: 'destructive',
    });
  };
}
```

**注意**: `<Toaster />` 组件已添加到 `layout.tsx`，无需在每个页面单独添加。

## 最佳实践

### 1. 优先使用 shadcn/ui 组件

对于通用 UI 模式（表单、对话框、选择器等），优先使用 shadcn/ui 组件：

- **表单控件**: Input, Textarea, Select, Switch, Checkbox
- **反馈组件**: Toast, AlertDialog, Dialog
- **导航组件**: Tabs, DropdownMenu
- **展示组件**: Card, Badge, Avatar

### 2. 使用 @mobazha/ui 组件

对于业务特定组件，使用 `@mobazha/ui`：

- ProductCard, OrderCard, VendorCard
- Header, Footer, MobileNav
- Container, Grid, HStack, VStack

### 3. 样式合并

使用 `cn()` 工具合并类名：

```tsx
import { cn } from '@/lib/utils';

<Button className={cn('custom-class', isActive && 'active-class')} />;
```

### 4. 暗色模式支持

shadcn/ui 组件自动支持暗色模式，使用 CSS 变量：

```tsx
// 自动适配暗色模式
<Card className="bg-surface text-text-primary">
```

## 添加新组件

如需添加新的 shadcn/ui 组件：

1. 从 [shadcn/ui](https://ui.shadcn.com/docs/components) 复制组件代码
2. 放置到 `apps/web/src/components/ui/` 目录
3. 在 `apps/web/src/components/ui/index.ts` 中导出
4. 调整样式以适配项目的 Tailwind 配置

## 相关文档

- [shadcn/ui 官方文档](https://ui.shadcn.com)
- [Radix UI 文档](https://www.radix-ui.com/docs/primitives)
- [主题系统](./theme-system.md)
