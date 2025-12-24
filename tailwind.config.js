/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        primary: 'var(--primary)',
        'primary-2': 'var(--primary-2)',
        'primary-contrast': 'var(--primary-contrast)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      boxShadow: {
        'custom': 'var(--shadow)',
        'custom-soft': 'var(--shadow-soft)',
      },
      borderRadius: {
        'custom': 'var(--radius)',
        'custom-sm': 'var(--radius-sm)',
      },
      gap: {
        'custom': 'var(--gap)',
      },
      maxWidth: {
        'custom': 'var(--max)',
      },
      animation: {
        'pulse-recording': 'pulse-recording 1.4s infinite',
      },
      backdropBlur: {
        'custom': '10px',
      }
    },
  },
  plugins: [],
}