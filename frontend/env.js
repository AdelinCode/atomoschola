// Environment configuration
// This file can be replaced during build/deployment with actual values
window.ENV = {
  // API URL - will be replaced during deployment
  API_URL: '__API_URL__' // Placeholder that will be replaced
};

// If placeholder wasn't replaced, use default
if (window.ENV.API_URL === '__API_URL__') {
  window.ENV.API_URL = null; // Will fall back to config.js default
}
