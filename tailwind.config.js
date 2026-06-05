/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Momotaro Premium Light & Lavender palette
        bg:                '#F4F6FB',
        'bg-2':            '#FFFFFF',
        'brand-purple':    '#6C5DD3',
        'brand-lavender':  '#ECEFFA',
        
        // Text and UI shades
        'text-primary':    '#1E1B4B',
        'text-secondary':  '#6B7280',
        'text-tertiary':   '#8A94A6',
        
        // Pastels for fitness analytics
        'accent-cyan':     '#38BDF8',
        'accent-orange':   '#FB923C',
        'accent-green':    '#10B981',
        'accent-indigo':   '#4F46E5',

        // Compat mappings to keep old code building perfectly
        'holo-cyan':       '#38BDF8',
        'laser-blue':      '#6C5DD3',
        'cyber-pink':      '#FB923C',
        'electric-purple': '#4F46E5',
        'matrix-green':    '#10B981',
        'solar-amber':     '#FB923C',

        blue:      '#38BDF8',
        'blue-2':  '#6C5DD3',
        cyan:      '#38BDF8',
        indigo:    '#6C5DD3',
        'gemini-blue': '#38BDF8',
        'gemini-purple': '#6C5DD3',
        'gemini-pink': '#FB923C',
        'gemini-amber': '#FB923C',
        
        line:      'rgba(108, 93, 211, 0.08)',
        'glass-border': 'rgba(108, 93, 211, 0.04)',
        success:   '#10B981',
        warn:      '#FB923C',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter'],
        mono: ['JetBrainsMono'],
      },
    },
  },
  plugins: [],
};

