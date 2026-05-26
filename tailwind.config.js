/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg:        '#020409',
        'bg-2':    '#03040A',
        blue:      '#38BDF8',
        'blue-2':  '#0EA5E9',
        cyan:      '#67E8F9',
        indigo:    '#818CF8',
        'text-1':  'rgba(238, 240, 246, 0.92)',
        'text-2':  'rgba(170, 178, 200, 0.42)',
        'text-3':  'rgba(150, 160, 185, 0.20)',
        line:      'rgba(204, 218, 240, 0.05)',
        success:   '#86EFAC',
        warn:      '#FBBF24',
      },
      fontFamily: {
        sans: ['Inter'],
        mono: ['JetBrainsMono'],
      },
    },
  },
  plugins: [],
};
