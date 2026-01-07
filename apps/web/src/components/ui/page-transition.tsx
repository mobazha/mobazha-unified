'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * 页面淡入动画容器
 */
export function FadeIn({ children, className }: PageTransitionProps) {
  return (
    <div className={cn('animate-in fade-in duration-300', className)}>
      {children}
    </div>
  );
}

/**
 * 页面向上滑入动画容器
 */
export function SlideInUp({ children, className }: PageTransitionProps) {
  return (
    <div className={cn('animate-in slide-in-from-bottom-4 fade-in duration-300', className)}>
      {children}
    </div>
  );
}

/**
 * 页面向下滑入动画容器
 */
export function SlideInDown({ children, className }: PageTransitionProps) {
  return (
    <div className={cn('animate-in slide-in-from-top-4 fade-in duration-300', className)}>
      {children}
    </div>
  );
}

/**
 * 页面向左滑入动画容器
 */
export function SlideInLeft({ children, className }: PageTransitionProps) {
  return (
    <div className={cn('animate-in slide-in-from-right-4 fade-in duration-300', className)}>
      {children}
    </div>
  );
}

/**
 * 页面向右滑入动画容器
 */
export function SlideInRight({ children, className }: PageTransitionProps) {
  return (
    <div className={cn('animate-in slide-in-from-left-4 fade-in duration-300', className)}>
      {children}
    </div>
  );
}

/**
 * 缩放淡入动画容器
 */
export function ZoomIn({ children, className }: PageTransitionProps) {
  return (
    <div className={cn('animate-in zoom-in-95 fade-in duration-300', className)}>
      {children}
    </div>
  );
}

interface StaggeredListProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  staggerDelay?: number; // 每项延迟 (ms)
}

/**
 * 交错动画列表容器
 */
export function StaggeredList({
  children,
  className,
  itemClassName,
  staggerDelay = 50,
}: StaggeredListProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn('animate-in fade-in slide-in-from-bottom-2', itemClassName)}
          style={{ animationDelay: `${index * staggerDelay}ms`, animationFillMode: 'both' }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * 加载状态过渡
 */
interface LoadingTransitionProps {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LoadingTransition({
  loading,
  skeleton,
  children,
  className,
}: LoadingTransitionProps) {
  if (loading) {
    return <div className={className}>{skeleton}</div>;
  }

  return (
    <FadeIn className={className}>
      {children}
    </FadeIn>
  );
}

/**
 * 懒加载容器 - 进入视口时触发动画
 */
export function LazyReveal({ children, className }: PageTransitionProps) {
  return (
    <div className={cn('animate-in fade-in slide-in-from-bottom-4 duration-500', className)}>
      {children}
    </div>
  );
}

