/**
 * Input 组件测试
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../components/Input';

describe('Input', () => {
  it('应正确渲染输入框', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('应正确处理输入变化', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('应显示标签', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('应显示错误消息', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('错误状态应有红色边框', () => {
    render(<Input error="Error" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
  });

  it('禁用状态应不可编辑', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('应支持前缀图标', () => {
    render(<Input leftIcon={<span data-testid="icon">🔍</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('应支持后缀图标', () => {
    render(<Input rightIcon={<span data-testid="icon">✓</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('应应用不同的尺寸', () => {
    const { rerender } = render(<Input size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('h-8');

    rerender(<Input size="md" />);
    expect(screen.getByRole('textbox')).toHaveClass('h-10');

    rerender(<Input size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('h-12');
  });

  it('fullWidth 属性应使输入框容器占满宽度', () => {
    render(<Input fullWidth />);
    // fullWidth 应用于容器而非 input 本身
    expect(screen.getByRole('textbox').parentElement?.parentElement).toHaveClass('w-full');
  });
});
