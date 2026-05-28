/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg:        '#03050C', // deep space black/blue background
        'bg-2':    '#070A15', // secondary layered deep background
        blue:      '#38BDF8',
        'blue-2':  '#0EA5E9',
        cyan:      '#06B6D4',
        indigo:    '#4F46E5',
        'gemini-blue': '#4285F4',
        'gemini-purple': '#A855F7',
        'gemini-pink': '#EC4899',
        'gemini-amber': '#F59E0B',
        'text-1':  'rgba(238, 240, 246, 0.94)',
        'text-2':  'rgba(170, 178, 200, 0.55)',
        'text-3':  'rgba(150, 160, 185, 0.28)',
        line:      'rgba(255, 255, 255, 0.06)',
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        success:   '#10B981',
        warn:      '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter'],
        mono: ['JetBrainsMono'],
      },
    },
  },
  plugins: [],
};
