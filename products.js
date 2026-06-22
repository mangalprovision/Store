window.SHOP_CONFIG = {
  shopName: 'Mangal Provision Super Shop',
  ownerWhatsApp: '919403393688',
  alternatePhone: '+91 88052 65233',
  location: 'Pune, Maharashtra',
  appsScriptUrl:
    'https://script.google.com/macros/s/AKfycbxZ6eGvzipnAY1dDQf63jZdcW_A1M6Ikjr6n-q7GTMgHDcuPv6i78lfFAY_OZrL1Pea_A/exec',
  /**
   * Netlify-only: when true, POST JSON to /.netlify/functions/save-order (or orderProxyUrl).
   * Default false = browser form POST to appsScriptUrl (GitHub Pages, static hosts, file:// dev).
   */
  useNetlifyOrderProxy: false,
  /** Netlify custom domain: set to "/.netlify/functions/save-order" when useNetlifyOrderProxy is true. */
  orderProxyUrl: '',
  /** Path to catalog JSON (relative to the page URL). */
  catalogUrl: 'catalog.json',
  /**
   * Display order for product categories (nav + listing). Dry fruits first, then groceries.
   * Categories not listed appear after these, in catalog.json key order.
   */
  categoryOrder: [
    'Cashews',
    'Almonds',
    'Walnut',
    'Kismis (Raisins)',
    'Khajur (Dates)',
    'Anjir',
    'Pista',
    'Jardalu (Dried Apricot)',
    'Rice',
    'Wheat',
    'Pulses',
    'Millets',
    'Mirchi Powder',
    'Masala',
    'Whole Red Chilli',
    'Other Spices'
  ]
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
