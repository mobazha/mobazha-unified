import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class', // 启用 class 模式，支持主题切换
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 语义化颜色 - 使用 CSS 变量支持动态主题
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primaryLight)',
          dark: 'var(--color-primaryDark)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          light: 'var(--color-secondaryLight)',
          dark: 'var(--color-secondaryDark)',
        },
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',

        // 背景色
        background: 'var(--color-background)',
        'background-alt': 'var(--color-backgroundAlt)',
        surface: 'var(--color-surface)',
        'surface-hover': 'var(--color-surfaceHover)',

        // 文字色
        'text-primary': 'var(--color-textPrimary)',
        'text-secondary': 'var(--color-textSecondary)',
        'text-muted': 'var(--color-textMuted)',
        'text-inverse': 'var(--color-textInverse)',

        // 边框色
        border: 'var(--color-border)',
        'border-light': 'var(--color-borderLight)',

        // shadcn/ui 兼容 - ring 颜色
        ring: 'var(--color-primary)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-heading, Inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono, JetBrains Mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px var(--color-glow, transparent)',
      },
      backgroundImage: {
        'theme-gradient': 'var(--color-gradient, none)',
      },
      // shadcn/ui 动画
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
