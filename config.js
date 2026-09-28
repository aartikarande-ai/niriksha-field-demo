/* Public client configuration. Never put passwords or signing secrets here. */
const capacitorOrigin = window.location.protocol === 'capacitor:' ||
  (window.location.hostname === 'localhost' && window.location.port === '');
window.NIRIKSHA_CONFIG = {
  // Browser/Render keeps same-origin API calls. Packaged Android uses Render.
  apiBaseUrl: capacitorOrigin ? 'https://niriksha-field-demo.onrender.com' : ''
};
