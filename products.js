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
  productCacheMinutes: 3,
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


/** Read a fresh cache only; missing or expired cache triggers loading. */
function getValidCachedCatalog() {
  try {
    const raw = localStorage.getItem('mangal_products_cache_v1');
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const ttl = (Number(window.SHOP_CONFIG.productCacheMinutes) || 30) * 60000;
    if (typeof cached.savedAt !== 'number' || Date.now() - cached.savedAt >= ttl || cached.savedAt > Date.now()) return null;
    if (!isCatalog_(cached.catalog)) return null;
    return cached.catalog;
  } catch (err) {
    return null;
  }
}

function isCatalog_(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    !value.error && Object.values(value).every(items => Array.isArray(items));
}

/** Never cache the fallback: retry Google Sheets next time. */
async function loadCatalog() {
  const cached = getValidCachedCatalog();
  if (cached) {
    window.CATALOG = cached;
    return cached;
  }

  const cfg = window.SHOP_CONFIG;
  try {
    const apiUrl = cfg.appsScriptUrl +
      (cfg.appsScriptUrl.includes('?') ? '&' : '?') + 'mode=products';
    const response = await fetch(apiUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Google Sheets HTTP ' + response.status);
    const data = await response.json();
    if (!isCatalog_(data)) throw new Error('Invalid Google Sheets catalog');
    window.CATALOG = data;
    try {
      localStorage.setItem('mangal_products_cache_v1', JSON.stringify({
        savedAt: Date.now(), catalog: data
      }));
    } catch (err) { console.warn('[Mangal] Cache unavailable:', err); }
    return data;
  } catch (err) {
    console.warn('[Mangal] Google Sheets unavailable, using catalog.json:', err);
    try {
      const response = await fetch(cfg.catalogUrl || 'catalog.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Fallback HTTP ' + response.status);
      const data = await response.json();
      if (!isCatalog_(data)) throw new Error('Invalid fallback catalog');
      window.CATALOG = data;
      return data;
    } catch (fallbackErr) {
      console.error('[Mangal] Could not load products:', fallbackErr);
      window.CATALOG = {};
      return {};
    }
  }
}
