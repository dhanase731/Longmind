module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } }
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out'
      },
      colors: {
        'gpt-green': '#10a37f'
      }
    }
  },
  plugins: []
}
