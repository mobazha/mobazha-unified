# Desktop UX Detailed Reference

## Hover Effects Examples

### Card

```tsx
<Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
  Content
</Card>
// Or utility class:
<Card className="hover-lift">Content</Card>
```

### Button

```tsx
<Button className="hover:bg-primary/90">Primary</Button>
<Button variant="outline" className="hover:bg-muted">Secondary</Button>
<Button variant="ghost" className="hover:bg-muted/50">Ghost</Button>
```

### Link

```tsx
<a href="#" className="hover:text-primary hover:underline transition-colors">
  Link text
</a>
<Link className="hover:bg-muted rounded-md px-3 py-2 transition-colors">
  Nav item
</Link>
```

### List Item

```tsx
<div className="hover:bg-muted/50 transition-colors cursor-pointer rounded-lg">
  List item
</div>
<tr className="hover:bg-muted/30 transition-colors">
  <td>...</td>
</tr>
```

### Image

```tsx
// Scale effect (in container)
<div className="overflow-hidden rounded-lg">
  <img className="transition-transform duration-300 hover:scale-105" />
</div>

// Overlay effect
<div className="relative group">
  <img src="..." />
  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
</div>
```

## Keyboard Navigation

### Focus States

```tsx
<button className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
  Button
</button>
<input className="focus:ring-2 focus:ring-primary focus:border-primary" />
```

### Tab Navigation

```tsx
<div tabIndex={0} role="button" onKeyDown={handleKeyDown}>
  Focusable element
</div>
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### Key Events

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      handleClick();
      e.preventDefault();
      break;
    case 'Escape':
      handleClose();
      break;
    case 'ArrowDown':
      focusNext();
      e.preventDefault();
      break;
    case 'ArrowUp':
      focusPrev();
      e.preventDefault();
      break;
  }
};
```

### Key Mapping

| Key         | Action                     |
| ----------- | -------------------------- |
| Tab         | Next focusable element     |
| Shift+Tab   | Previous focusable element |
| Enter/Space | Trigger click/select       |
| Escape      | Close modal/dropdown       |
| Arrow Keys  | Navigate in list/menu      |
| Home/End    | Jump to list start/end     |

## Desktop-Specific Features

### Context Menu

```tsx
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

<ContextMenu>
  <ContextMenuTrigger>
    <ProductCard />
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onClick={handleEdit}>Edit</ContextMenuItem>
    <ContextMenuItem onClick={handleDelete}>Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>;
```

### Drag & Drop

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={items} strategy={verticalListSortingStrategy}>
    {items.map(item => (
      <SortableItem key={item.id} {...item} />
    ))}
  </SortableContext>
</DndContext>;
```

### Batch Operations

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

<div className="flex items-center gap-2 mb-4">
  <Checkbox checked={selectedIds.size === items.length} onCheckedChange={handleSelectAll} />
  <span>Select All</span>
  {selectedIds.size > 0 && (
    <>
      <Button variant="outline" size="sm" onClick={handleBatchDelete}>
        Delete ({selectedIds.size})
      </Button>
      <Button variant="outline" size="sm" onClick={handleBatchExport}>
        Export
      </Button>
    </>
  )}
</div>;
```

### Keyboard Shortcuts

```tsx
import { useHotkeys } from 'react-hotkeys-hook';

useHotkeys('ctrl+k, cmd+k', () => openSearch(), { preventDefault: true });
useHotkeys('ctrl+n, cmd+n', () => createNew(), { preventDefault: true });
useHotkeys('escape', () => closeModal());

// Show shortcut hints
<Tooltip>
  <TooltipTrigger>
    <Button>Search</Button>
  </TooltipTrigger>
  <TooltipContent>
    Search <kbd className="ml-2 px-1 bg-muted rounded text-xs">⌘K</kbd>
  </TooltipContent>
</Tooltip>;
```

### Tooltips

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <Settings className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Settings</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>;
```

### Custom Scrollbar

Already defined in `globals.css`:

```css
@media (min-width: 768px) {
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--theme-border);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--theme-textMuted);
  }
}
```

## Layout Patterns

### Sidebar Layout

```tsx
<div className="flex">
  <aside className="hidden lg:block w-64 shrink-0 border-r">
    <Navigation />
  </aside>
  <main className="flex-1">{children}</main>
</div>
```

### List vs Table

```tsx
{
  isMobile ? (
    <div className="space-y-3">
      {items.map(item => (
        <ItemCard key={item.id} {...item} />
      ))}
    </div>
  ) : (
    <Table>
      <TableHeader>...</TableHeader>
      <TableBody>
        {items.map(item => (
          <TableRow key={item.id}>...</TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Grid

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
  {products.map(p => (
    <ProductCard key={p.id} {...p} />
  ))}
</div>
```

## Breakpoints

```typescript
const BREAKPOINTS = {
  mobile: 0, // < 768px
  tablet: 768, // 768-1023px
  desktop: 1024, // 1024-1439px
  large: 1440, // >= 1440px
};
```

```tsx
<div className="
  p-3 md:p-4 lg:p-6
  text-sm md:text-base
  grid-cols-2 md:grid-cols-3 lg:grid-cols-4
  hidden lg:block
">
```
