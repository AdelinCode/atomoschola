// API Configuration
const CONFIG = {
  // API URL - uses environment variable or falls back to localhost
  API_BASE_URL: (() => {
    // Check if we're in development (localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    
    // Production - use API_URL from environment
    return process.env.API_URL || 'https://atomoschola-backend.vercel.app/api';
  })(),
  
  // Environment detection
  IS_DEVELOPMENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
  IS_PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
};

// Make config available globally
window.CONFIG = CONFIG;

// Log environment info in development
if (CONFIG.IS_DEVELOPMENT) {
  console.log('🔧 Development Mode');
  console.log('API URL:', CONFIG.API_BASE_URL);
} else {
  console.log('🚀 Production Mode');
  console.log('API URL:', CONFIG.API_BASE_URL);
}