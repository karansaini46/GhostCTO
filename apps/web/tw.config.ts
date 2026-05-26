import type { Config } from 'tailwindcss';

const tokenColor = (name: string) => `hsl(var(--color-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: tokenColor('accent'),
        'accent-soft': tokenColor('accent-soft'),
        background: tokenColor('background'),
        border: tokenColor('border'),
        clay: tokenColor('clay'),
        danger: tokenColor('danger'),
        focus: tokenColor('focus'),
        muted: tokenColor('muted-text'),
        secondary: tokenColor('secondary-text'),
        subtle: tokenColor('subtle-border'),
        success: tokenColor('success'),
        surface: {
          DEFAULT: tokenColor('surface'),
          card: tokenColor('surface-card'),
          elevated: tokenColor('surface-elevated'),
          raised: tokenColor('surface-raised'),
          soft: tokenColor('surface-soft'),
        },
        text: tokenColor('text'),
        warning: tokenColor('warning'),
      },
      borderRadius: {
        panel: '1rem',
      },
      boxShadow: {
        hairline: '0 0 0 1px hsl(var(--color-subtle-border) / 0.76)',
        panel: '0 22px 70px hsl(36 24% 34% / 0.12), 0 2px 10px hsl(36 20% 34% / 0.06)',
        soft: '0 14px 40px hsl(36 24% 34% / 0.1), 0 1px 4px hsl(36 24% 34% / 0.08)',
      },
      fontFamily: {
        editorial: ['Newsreader', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: [
          'Instrument Sans',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.2, 0.72, 0.18, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
