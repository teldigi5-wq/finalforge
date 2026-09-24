/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './assets/**/*.js', './api/**/*.js'],
  important: true,
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        ff: {
          bg: '#05090F',
          bg2: '#060B14',
          panel: '#0E1B2D',
          panel2: '#10233A',
          text: '#F2F7FD',
          muted: '#9DB0C8',
          border: '#213956',
          blue: '#5AA9FF',
          violet: '#8B7CFF'
        }
      },
      backgroundImage: {
        'ff-accent': 'linear-gradient(105deg, #5AA9FF 0%, #8B7CFF 100%)'
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      },
      borderRadius: {
        '2xl': '16px'
      },
      boxShadow: {
        'ff-card': '0 14px 36px rgba(0,0,0,.18)',
        'ff-glow': '0 12px 32px rgba(100,105,255,.28)'
      },
      transitionTimingFunction: {
        ff: 'cubic-bezier(.22,1,.36,1)'
      }
    }
  },
  plugins: []
};
