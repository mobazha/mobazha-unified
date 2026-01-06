/**
 * Card 组件测试
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '../../components/Card';

describe('Card', () => {
  it('应正确渲染子元素', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('应应用默认样式', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('rounded-xl');
  });

  it('应应用 padding 变体', () => {
    const { rerender } = render(
      <Card padding="none" data-testid="card">
        Content
      </Card>
    );
    let card = screen.getByTestId('card');
    expect(card).not.toHaveClass('p-4');

    rerender(
      <Card padding="sm" data-testid="card">
        Content
      </Card>
    );
    card = screen.getByTestId('card');
    expect(card).toHaveClass('p-3');

    rerender(
      <Card padding="md" data-testid="card">
        Content
      </Card>
    );
    card = screen.getByTestId('card');
    expect(card).toHaveClass('p-4');

    rerender(
      <Card padding="lg" data-testid="card">
        Content
      </Card>
    );
    card = screen.getByTestId('card');
    expect(card).toHaveClass('p-6');
  });

  it('hoverable 属性应添加悬停效果', () => {
    render(
      <Card hoverable data-testid="card">
        Content
      </Card>
    );
    expect(screen.getByTestId('card')).toHaveClass('cursor-pointer');
  });

  it('应处理点击事件', () => {
    const handleClick = vi.fn();
    render(
      <Card onClick={handleClick} data-testid="card">
        Content
      </Card>
    );

    fireEvent.click(screen.getByTestId('card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('应支持自定义类名', () => {
    render(
      <Card className="custom-class" data-testid="card">
        Content
      </Card>
    );
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });
});
