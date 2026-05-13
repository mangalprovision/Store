window.SHOP_CONFIG = {
  shopName: 'Mangal Provision Super Shop',
  ownerWhatsApp: '919403393688',
  alternatePhone: '+91 88052 65233',
  location: 'Pune, Maharashtra',
  appsScriptUrl:
    'https://script.google.com/macros/s/AKfycby-zGl-Y-QRJX1F_aAhdflhcP_aYiL-EFEtZTvHIv4ls3sbKZ3M4EnKdrAUzmwqPqenuA/exec',
  /**
   * Netlify-only: when true, POST JSON to /.netlify/functions/save-order (or orderProxyUrl).
   * Default false = browser form POST to appsScriptUrl (GitHub Pages, static hosts, file:// dev).
   */
  useNetlifyOrderProxy: false,
  /** Netlify custom domain: set to "/.netlify/functions/save-order" when useNetlifyOrderProxy is true. */
  orderProxyUrl: '',
  /** Path to catalog JSON (relative to the page URL). */
  catalogUrl: 'catalog.json'
};

(function loadCatalog() {
  var url = window.SHOP_CONFIG.catalogUrl || 'catalog.json';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.send(null);
  if (xhr.status < 200 || xhr.status >= 300) {
    console.error('[Mangal] Failed to load catalog:', url, 'HTTP', xhr.status);
    window.CATALOG = {};
    return;
  }
  try {
    window.CATALOG = JSON.parse(xhr.responseText);
  } catch (e) {
    console.error('[Mangal] Invalid catalog.json', e);
    window.CATALOG = {};
  }
})();
