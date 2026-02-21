/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vybe brand colors
        vybe: {
          yellow: '#fec539',
          blue: '#539dc0',
          red: '#f14573',
          purple: '#63688c',
        },
        twitter: '#1DA1F2',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'app': '0 0 50px rgba(0, 0, 0, 0.3)',
        'card': '0 2px 16px rgba(0, 0, 0, 0.08)',
        'card-sm': '0 2px 12px rgba(0, 0, 0, 0.06)',
        'primary': '0 4px 20px rgba(99, 102, 241, 0.4)',
        'primary-sm': '0 2px 12px rgba(99, 102, 241, 0.4)',
        'emerald': '0 4px 16px rgba(16, 185, 129, 0.3)',
        'twitter': '0 4px 20px rgba(29, 161, 242, 0.4)',
        'nav': '0 -2px 20px rgba(0, 0, 0, 0.08)',
        'dialog': '0 20px 60px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'spin-fast': 'spin 0.8s linear infinite',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      maxWidth: {
        'app': '430px',
      },
    },
  },
  plugins: [],
}
