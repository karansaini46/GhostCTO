import type { Config } from 'tailwindcss';

const tokenColor = (name: string) => `hsl(var(--color-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: tokenColor('accent'),
        background: tokenColor('background'),
        border: tokenColor('border'),
        danger: tokenColor('danger'),
        muted: tokenColor('muted-text'),
        success: tokenColor('success'),
        surface: {
          DEFAULT: tokenColor('surface'),
          raised: tokenColor('surface-raised'),
        },
        text: tokenColor('text'),
        warning: tokenColor('warning'),
      },
      boxShadow: {
        panel: '0 24px 80px hsl(var(--color-background) / 0.42)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
