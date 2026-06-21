const config = window.SHOP_CONFIG;
/**const catalog = window.CATALOG; */
let catalog = {};
const cart = new Map();
/** Step for +/− on product cards and order summary (kg or per-unit). */
const QTY_STEP = 0.25;

function categorySlug(cat) {
  return String(cat)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'category';
}
/**async function loadCatalog() {

  const response =
    await fetch(
      "https://script.google.com/macros/s/AKfycbxZ6eGvzipnAY1dDQf63jZdcW_A1M6Ikjr6n-q7GTMgHDcuPv6i78lfFAY_OZrL1Pea_A/exec?mode=products"
    );

  catalog =
    await response.json();
} */

async function loadCatalog() {

  const CACHE_KEY = "mangal_catalog";
  const CACHE_TIME_KEY = "mangal_catalog_time";

  const CACHE_DURATION =
      5 * 60 * 1000; // 5 minutes

  try {

    const cachedData =
      localStorage.getItem(CACHE_KEY);

    const cachedTime =
      localStorage.getItem(CACHE_TIME_KEY);

    if (
      cachedData &&
      cachedTime &&
      (Date.now() - Number(cachedTime))
        < CACHE_DURATION
    ) {

      console.log(
        "Loading catalog from cache"
      );

      catalog =
        JSON.parse(cachedData);

      return;
    }

    console.log(
      "Loading catalog from Google Sheet"
    );

    const response =
      await fetch(
        "https://script.google.com/macros/s/AKfycbxZ6eGvzipnAY1dDQf63jZdcW_A1M6Ikjr6n-q7GTMgHDcuPv6i78lfFAY_OZrL1Pea_A/exec?mode=products"
      );

    catalog =
      await response.json();

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify(catalog)
    );

    localStorage.setItem(
      CACHE_TIME_KEY,
      Date.now().toString()
    );

  } catch (err) {

    console.error(
      "Catalog load failed",
      err
    );

    if (
      localStorage.getItem(CACHE_KEY)
    ) {

      catalog =
        JSON.parse(
          localStorage.getItem(CACHE_KEY)
        );

      console.log(
        "Using cached catalog because API failed"
      );
    }
  }
}

/** Category names in display order (dry fruits first per SHOP_CONFIG.categoryOrder). */
function orderedCategories() {
  const keys = Object.keys(catalog);
  const order = config.categoryOrder;
  if (!Array.isArray(order) || !order.length) return keys;
  const seen = new Set();
  const result = [];
  for (const cat of order) {
    if (keys.includes(cat) && !seen.has(cat)) {
      result.push(cat);
      seen.add(cat);
    }
  }
  for (const cat of keys) {
    if (!seen.has(cat)) result.push(cat);
  }
  return result;
}

function orderedCatalogEntries() {
  return orderedCategories().map(cat => [cat, catalog[cat]]);
}

const $ = id => document.getElementById(id);
const rupee = n => '₹' + Math.round(n || 0);
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

function newOrderId() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${stamp}-${rand}`;
}

function waLink(text) {
  return `https://wa.me/${config.ownerWhatsApp}?text=${encodeURIComponent(text)}`;
}

function findProduct(id) {
  for (const [cat, items] of Object.entries(catalog)) {
    const p = items.find(x => x.id === id);
    if (p) return { cat, p };
  }
  return null;
}

function priceLabel(p) {
  if (p.variants) {
    return `${rupee(p.variants[0].price)}–${rupee(p.variants[p.variants.length - 1].price)}/${p.unit || 'kg'}`;
  }
  return `${rupee(p.price)}/${p.unit || 'kg'}`;
}

function selectedPrice(id) {
  const sel = $('var_' + id);
  if (sel) return Number(sel.value);
  const fix = $('price_' + id);
  return fix ? Number(fix.value) : 0;
}

function selectedVariant(id) {
  const sel = $('var_' + id);
  return sel ? sel.options[sel.selectedIndex].text : 'Standard';
}

function renderCategoryNav() {
  const cats = orderedCategories();
  const nav = $('categoryNav');
  if (!nav) return;
  const links = [
    `<a href="#products" class="cat-link">All</a>`,
    ...cats.map(c => {
      const id = categorySlug(c);
      return `<a href="#cat-${id}" class="cat-link">${escapeHtml(c)}</a>`;
    })
  ];
  nav.innerHTML = links.join('');
  syncCategoryNavActive();
}

function syncCategoryNavActive() {
  const nav = $('categoryNav');
  if (!nav) return;
  const h = (typeof location !== 'undefined' && location.hash) || '';
  if (!h || h === '#products') {
    nav.querySelectorAll('a.cat-link').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#products');
    });
    return;
  }
  nav.querySelectorAll('a.cat-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === h);
  });
}

function productCard(cat, p) {
  const id = p.id;
  const q = cart.get(id)?.qty || 0;
  const variant = p.variants
    ? `<select class="variant-select" id="var_${id}" data-id="${id}" aria-label="Variant for ${escapeHtml(p.name)}">${
        p.variants.map(v => `<option value="${v.price}">${escapeHtml(v.label)}</option>`).join('')
      }</select>`
    : `<input type="hidden" id="price_${id}" value="${p.price}"><div class="variant-fixed">Standard</div>`;
  return `<div class="product">
    <div class="p-name">${escapeHtml(p.name)}</div>
    <div class="p-price">${priceLabel(p)}</div>
    ${variant}
    <div class="qty" role="group" aria-label="Quantity for ${escapeHtml(p.name)}">
      <button data-action="qty" data-id="${id}" data-delta="${-QTY_STEP}" aria-label="Decrease ${escapeHtml(p.name)}">−</button>
      <input class="qty-input" id="qty_${id}" data-id="${id}" value="${q}" inputmode="decimal" aria-label="Quantity for ${escapeHtml(p.name)}">
      <button data-action="qty" data-id="${id}" data-delta="${QTY_STEP}" aria-label="Increase ${escapeHtml(p.name)}">+</button>
    </div>
  </div>`;
}

function renderProducts() {
  const term = $('search').value.trim().toLowerCase();
  let html = '';
  orderedCatalogEntries().forEach(([cat, items]) => {
    const filtered = items.filter(p => !term || p.name.toLowerCase().includes(term) || cat.toLowerCase().includes(term));
    if (!filtered.length) return;
    const anchor = categorySlug(cat);
    html += `<div id="cat-${anchor}" class="category anchor-category"><h3 class="category-title"><span class="category-title-text">${escapeHtml(cat)}</span></h3><div class="product-grid">${filtered.map(p => productCard(cat, p)).join('')}</div></div>`;
  });
  $('productList').innerHTML = html || '<p class="muted">No products found.</p>';
}

function setQty(id, val) {
  const qty = Math.max(0, +(Number(val) || 0).toFixed(2));
  const input = $('qty_' + id);
  if (input) input.value = qty;
  if (qty > 0) {
    const found = findProduct(id);
    if (!found) return;
    const existing = cart.get(id);
    const hasPriceUi = !!$('var_' + id) || !!$('price_' + id);
    let price;
    let variant;
    if (hasPriceUi) {
      price = selectedPrice(id);
      variant = selectedVariant(id);
    } else if (existing) {
      price = existing.price;
      variant = existing.variant;
    } else {
      const p = found.p;
      if (p.variants?.length) {
        price = Number(p.variants[0].price);
        variant = p.variants[0].label;
      } else {
        price = Number(p.price);
        variant = 'Standard';
      }
    }
    cart.set(id, {
      id,
      category: found.cat,
      name: found.p.name,
      unit: found.p.unit || 'kg',
      qty,
      price,
      variant
    });
  } else {
    cart.delete(id);
  }
  renderCart();
}

function renderCart() {
  const items = [...cart.values()];
  $('cartCountTop').textContent = items.length;
  if (!items.length) {
    $('cartItems').className = 'cart-items empty';
    $('cartItems').innerHTML = 'Add products above to see your order summary.';
    $('total').textContent = '₹0';
    return;
  }
  $('cartItems').className = 'cart-items';
  let total = 0;
  $('cartItems').innerHTML = items.map(i => {
    const amt = i.qty * i.price;
    total += amt;
    const label = escapeHtml(i.name);
    return `<div class="cart-row">
      <div class="cart-row-info"><strong>${label}</strong>
        <div class="small muted">${escapeHtml(i.variant)} · ${i.qty} ${i.unit} × ${rupee(i.price)}</div>
      </div>
      <div class="cart-row-end">
        <div class="qty qty--cart" role="group" aria-label="Quantity for ${label}">
          <button type="button" data-action="cart-qty" data-id="${escapeHtml(i.id)}" data-delta="${-QTY_STEP}" aria-label="Decrease ${label}">−</button>
          <span class="qty-cart-mid" aria-hidden="true">${i.qty}</span>
          <button type="button" data-action="cart-qty" data-id="${escapeHtml(i.id)}" data-delta="${QTY_STEP}" aria-label="Increase ${label}">+</button>
        </div>
        <strong class="cart-row-total">${rupee(amt)}</strong>
      </div>
    </div>`;
  }).join('');
  $('total').textContent = rupee(total);
}

function validate() {
  if (!$('name').value.trim()) return 'Please enter full name.';
  const ph = $('phone').value.replace(/\D/g, '');
  if (ph.length < 10) return 'Please enter a valid 10-digit mobile number.';
  if (!$('address').value.trim()) return 'Please enter delivery address.';
  if (cart.size === 0) return 'Please add at least one product.';
  return '';
}

function buildOrder() {
  const items = [...cart.values()];
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  return {
    orderId: newOrderId(),
    createdAt: new Date().toISOString(),
    name: $('name').value.trim(),
    phone: $('phone').value.trim(),
    address: $('address').value.trim(),
    deliveryTime: $('deliveryTime').value,
    payment: $('payment').value,
    notes: $('notes').value.trim(),
    items,
    total
  };
}

function whatsAppText(order) {
  let msg = `🌾 *New Order – ${config.shopName}*\n`;
  msg += `🆔 *Order ID:* ${order.orderId}\n\n`;
  msg += `👤 *Name:* ${order.name}\n📞 *Phone:* ${order.phone}\n📍 *Address:* ${order.address}\n🕐 *Delivery:* ${order.deliveryTime}\n💳 *Payment:* ${order.payment}\n\n`;
  msg += `📦 *ORDER ITEMS:*\n`;
  order.items.forEach(i =>
    msg += `• ${i.name} (${i.variant}): ${i.qty} ${i.unit} × ${rupee(i.price)} = ${rupee(i.qty * i.price)}\n`
  );
  msg += `\n💰 *Estimated Total:* ${rupee(order.total)}`;
  if (order.notes) msg += `\n\n📝 *Notes:* ${order.notes}`;
  return msg;
}

function sheetDebug() {
  try {
    return /(?:\?|&)sheetdebug=1(?:&|$)/.test(window.location.search) ||
      window.localStorage.getItem('mangalSheetDebug') === '1';
  } catch (_) {
    return false;
  }
}

function logSheet(...args) {
  if (sheetDebug()) console.log('[Mangal sheet]', ...args);
}

/** Netlify order proxy URL, or empty when disabled / not on Netlify (e.g. GitHub Pages). */
function netlifyOrderProxyUrl() {
  if (config.useNetlifyOrderProxy !== true) return '';
  if (config.orderProxyUrl) return config.orderProxyUrl;
  if (typeof location !== 'undefined' && /\.netlify\.app$/i.test(location.hostname)) {
    return '/.netlify/functions/save-order';
  }
  return '';
}

/**
 * 1) Optional: Netlify function proxy when useNetlifyOrderProxy is true (Node handles redirects).
 * 2) Default: hidden form POST into iframe to appsScriptUrl (static hosts including GitHub Pages).
 */
function saveToSheet(order) {
  if (!config.appsScriptUrl || config.appsScriptUrl.includes('PASTE_YOUR')) {
    return Promise.resolve(false);
  }

  const proxyUrl = netlifyOrderProxyUrl();

  if (proxyUrl) {
    return fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify(order)
    })
      .then(async r => {
        const text = await r.text();
        logSheet('proxy status', r.status, text.slice(0, 500));
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = { ok: false, error: 'Non-JSON response' };
        }
        if (r.ok && data.ok !== false) return true;
        console.warn('[Mangal] Order proxy failed:', r.status, data);
        return formPostToSheet_(order);
      })
      .catch(err => {
        console.warn('[Mangal] Order proxy error:', err);
        return formPostToSheet_(order);
      });
  }

  return formPostToSheet_(order);
}

/**
 * Google Web App URLs return 302 to script.googleusercontent.com. fetch() in the
 * browser often drops POST on redirect. Form POST into iframe is a fallback.
 */
function formPostToSheet_(order) {
  return new Promise(resolve => {
    try {
      const iframe = document.createElement('iframe');
      iframe.name = 'sheet_' + Date.now();
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = config.appsScriptUrl;
      form.target = iframe.name;
      form.enctype = 'application/x-www-form-urlencoded';
      form.acceptCharset = 'UTF-8';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'order';
      input.value = JSON.stringify(order);
      form.appendChild(input);

      document.body.appendChild(form);
      logSheet('form POST to', config.appsScriptUrl);
      form.submit();

      iframe.addEventListener('load', () => {
        logSheet('iframe load');
      }, { once: true });

      // POST is sent when submit() returns; do not remove the iframe immediately — that
      // aborts Google's redirect chain and DevTools shows "exec" as (canceled) even when
      // doPost already ran. Remove the form after navigation starts; drop iframe later.
      setTimeout(() => {
        try { form.remove(); } catch (_) {}
      }, 500);
      setTimeout(() => {
        try { iframe.remove(); } catch (_) {}
      }, 10000);

      resolve(true);
    } catch (e) {
      logSheet('form error', e);
      resolve(false);
    }
  });
}

async function submitOrder() {
  const err = validate();
  if (err) { showToast(err); return; }
  const order = buildOrder();
  const btn = $('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  try {
    const saved = await saveToSheet(order);
    showToast(saved ? 'Order saved. Opening WhatsApp...' : 'Opening WhatsApp...');
    setTimeout(() => {
      window.open(waLink(whatsAppText(order)), '_blank');
    }, 500);
  } catch (e) {
    showToast('Could not save order. Opening WhatsApp...');
    window.open(waLink(whatsAppText(order)), '_blank');
  } finally {
    btn.disabled = false;
    btn.textContent = '📦 Place My Order';
  }
}

function goToCustomerDetails(ev) {
  if (ev) ev.preventDefault();
  const details = $('details');
  if (!details) return;
  details.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    history.replaceState(null, '', `${location.pathname}${location.search}#details`);
  } catch (_) {}
  setTimeout(() => $('name')?.focus({ preventScroll: true }), 450);
}

function updateStickyMetrics() {
  const top = $('siteHeaderTop');
  const header = $('siteHeader');
  const el = top || header;
  if (!el) return;
  const h = Math.ceil(el.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-h', `${h}px`);
  document.documentElement.style.setProperty('--sticky-pad', `${h + 12}px`);
}

function init() {
  $('waTop').href = waLink('Hello, I want to place an order from Mangal Provision Super Shop.');
  renderCategoryNav();
  renderProducts();
  renderCart();
  updateStickyMetrics();

  const header = $('siteHeader');
  if (header && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => updateStickyMetrics());
    ro.observe(header);
  }
  window.addEventListener('resize', updateStickyMetrics);
  if (window.matchMedia) {
    window.matchMedia('(min-width: 768px)').addEventListener('change', updateStickyMetrics);
  }

  $('search').addEventListener('input', () => {
    renderProducts();
    requestAnimationFrame(updateStickyMetrics);
  });
  $('submitBtn').addEventListener('click', submitOrder);

  $('checkoutBtn')?.addEventListener('click', goToCustomerDetails);

  const categoryNav = $('categoryNav');
  if (categoryNav) {
    categoryNav.addEventListener('click', e => {
      const a = e.target.closest('a.cat-link');
      if (!a) return;
      const href = a.getAttribute('href');
      if (href === '#products') {
        e.preventDefault();
        $('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', `${location.pathname}${location.search}`);
        syncCategoryNavActive();
        return;
      }
      if (href && href.startsWith('#cat-')) {
        e.preventDefault();
        const el = document.querySelector(href);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', `${location.pathname}${location.search}${href}`);
        }
        syncCategoryNavActive();
      }
    });
  }

  window.addEventListener('hashchange', syncCategoryNavActive);

  $('productList').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action="qty"]');
    if (!btn) return;
    const id = btn.dataset.id;
    const delta = Number(btn.dataset.delta);
    const cur = Number($('qty_' + id)?.value || 0);
    setQty(id, Math.max(0, cur + delta));
  });

  $('cartItems').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action="cart-qty"]');
    if (!btn) return;
    const id = btn.dataset.id;
    const delta = Number(btn.dataset.delta);
    const cur = cart.get(id)?.qty || 0;
    setQty(id, Math.max(0, cur + delta));
  });

  $('productList').addEventListener('change', e => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('qty-input')) {
      setQty(id, Number(e.target.value) || 0);
    } else if (e.target.classList.contains('variant-select')) {
      const cur = cart.get(id);
      if (cur) setQty(id, cur.qty);
    }
  });

  syncCategoryNavActive();
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }
}

/**init(); */

(async () => {

  await loadCatalog();

  init();

})();
