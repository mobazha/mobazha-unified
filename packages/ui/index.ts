/**
 * @mobazha/ui
 *
 * 基础 UI 组件已迁移至 shadcn/ui (apps/web/src/components/ui/)
 * 布局组件已迁移至本地 (apps/web/src/components/layouts/)
 *
 * 此包保留性能优化和工具组件
 */

// Performance Components
export * from './components';

// Hooks
export * from './hooks';

// Utils
export { cn } from './lib/utils';

// =============================================================================
// DEPRECATED EXPORTS - 以下组件已迁移，请使用新的导入路径
// =============================================================================

/**
 * @deprecated Button 组件已迁移到 shadcn/ui
 * 请使用: import { Button } from '@/components/ui/button'
 */
export const Button = undefined;

/**
 * @deprecated Card 组件已迁移到 shadcn/ui
 * 请使用: import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 */
export const Card = undefined;

/**
 * @deprecated Input 组件已迁移到 shadcn/ui
 * 请使用: import { Input } from '@/components/ui/input'
 * 或兼容版本: import { Input } from '@/components/ui/input-compat'
 */
export const Input = undefined;

/**
 * @deprecated Avatar 组件已迁移到 shadcn/ui
 * 请使用: import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
 * 或兼容版本: import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat'
 */
export const Avatar = undefined;

/**
 * @deprecated Skeleton 组件已迁移到 shadcn/ui
 * 请使用: import { Skeleton } from '@/components/ui/skeleton'
 * 或兼容版本: import { Skeleton } from '@/components/ui/skeleton-compat'
 */
export const Skeleton = undefined;

/**
 * @deprecated ProductCard 组件已迁移到 web 应用本地组件
 * 请使用: import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard'
 */
export const ProductCard = undefined;
export const ProductCardSkeleton = undefined;

/**
 * @deprecated 布局组件已迁移到 web 应用本地组件
 * 请使用: import { Container, HStack, VStack, Grid } from '@/components/layouts'
 */
export const Container = undefined;
export const HStack = undefined;
export const VStack = undefined;
export const Grid = undefined;
export const Stack = undefined;
