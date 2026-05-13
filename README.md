# Mangal Provision Super Shop — Free Grocery Ordering Website

A zero-infrastructure, mobile-first ordering site for a local grocery / dry-fruits store.
Customer places an order → row appears in **Google Sheet** → **WhatsApp** opens with a prefilled order message for the owner.

- Static site: `index.html`, `styles.css`, `app.js`, `products.js`, `catalog.json`
- Backend: Google Apps Script (`google-apps-script/Code.gs`)
- Storage: Google Sheet
- **Primary deployment:** [GitHub Pages](https://pages.github.com/) — static hosting; orders use a **hidden form POST** to your Apps Script Web App (no server). Repo includes an empty **`.nojekyll`** so Pages does not run Jekyll on these files.
- **Optional:** [Netlify](https://www.netlify.com/) with **`useNetlifyOrderProxy: true`** in `products.js` plus **`netlify/functions/save-order`** if you want a server-side POST proxy (see §3).

---

## 1. Run locally

No build step. Any static server works.

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Until you set **`appsScriptUrl`** in `products.js` (§2), the order button will skip the Sheet save and only open WhatsApp. If you use the **Netlify proxy** (`useNetlifyOrderProxy: true`), also set **`APPS_SCRIPT_WEBAPP_URL`** on Netlify (§3).

---

## 2. Set up Google Sheet + Apps Script (one-time)

1. Create a Google Sheet (any name, e.g. `Mangal Orders`).
2. In the sheet: **Extensions → Apps Script**.
3. Replace `Code.gs` content with the contents of `google-apps-script/Code.gs` from this repo. Save.
4. Run the function `setupSheet` once (top toolbar → select `setupSheet` → Run). Authorize when prompted.
5. **Deploy → New deployment → Web app**:
   - Description: `Mangal Orders`
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the **Web app URL**.

### Connect the website (set `appsScriptUrl`)

The repo may ship a **placeholder** in `products.js` so you can avoid committing the Web App URL; this checkout uses the deployed `/exec` URL directly (anyone can see it in the browser on your live site).

1. Open **`products.js`** in the project root.
2. Set **`appsScriptUrl`** to the Web app URL you copied in step 6 (must end with **`/exec`**):

```js
window.SHOP_CONFIG = {
  // ...
  appsScriptUrl: 'https://script.google.com/macros/s/…/exec',
  // ...
};
```

3. **GitHub Pages (default):** no extra env vars — the browser POSTs the order to **`appsScriptUrl`** via a hidden form. **Netlify proxy (optional):** set **`useNetlifyOrderProxy: true`** in `products.js` and add **`APPS_SCRIPT_WEBAPP_URL`** in Netlify (§3). The storefront still needs a real **`appsScriptUrl`** in the HTML you deploy; the env var is only for the serverless `save-order` function.

### Health check (optional)

Open the Web app URL in a browser. You should see:

```json
{ "ok": true, "service": "Mangal Provision Orders", "time": "..." }
```

### Script not bound to the Sheet?

If you created the project at [script.google.com](https://script.google.com) instead of **Extensions → Apps Script** inside the spreadsheet, `getActiveSpreadsheet()` has nothing to attach to.

Fix: in Apps Script, **Project Settings → Script properties** → add a property:

- **Property:** `SPREADSHEET_ID`  
- **Value:** the ID from your Sheet URL  
  `https://docs.google.com/spreadsheets/d/<THIS_PART>/edit`

Save, then **Deploy → Manage deployments → New version → Deploy** (or edit deployment and pick a new version).

### Orders not appearing in the Sheet?

Google’s Web App URL returns **302 redirects**. In the browser, **`fetch()` often turns the follow-up into GET**, so `doPost` never receives your JSON.

**Default (GitHub Pages, `useNetlifyOrderProxy: false`):** the site uses a **hidden form POST** into an iframe (`formPostToSheet_` in `app.js`) so Apps Script receives the payload without relying on `fetch()` redirects.

**Optional Netlify proxy:** set **`useNetlifyOrderProxy: true`** in `products.js`, set **`APPS_SCRIPT_WEBAPP_URL`** on Netlify (§3), and deploy on Netlify. The storefront then calls **`/.netlify/functions/save-order`**, which forwards JSON using **Node**. On a **Netlify custom domain**, set **`orderProxyUrl`** to **`"/.netlify/functions/save-order"`** as well.

If the sheet is still empty, use **Executions** in Apps Script and **`?sheetdebug=1`** (see “Debug blank Orders sheet” below).

After changing `Code.gs`, republish a **new deployment version** in Apps Script.

### Debug blank `Orders` sheet

1. **Apps Script → Executions** — open the latest run after you click *Place My Order*. If `doPost` throws (e.g. no spreadsheet), the error appears there.
2. **Script bound to the Sheet?** Open the script via **Extensions → Apps Script** on the same file that has the `Orders` tab. If the project was created at script.google.com, set **`SPREADSHEET_ID`** (see above).
3. **Browser console** — add `?sheetdebug=1` to your site URL or run `localStorage.setItem('mangalSheetDebug','1')` and reload. Submit an order; logs show **form POST** to Apps Script, or **Netlify proxy** status when `useNetlifyOrderProxy` is true.
4. **Network tab** — filter **All** (not only Fetch/XHR). Look for `save-order` (Netlify) or **POST** to `script.google.com`.

---

## 3. Deploy

**Default:** GitHub Pages — static files only; set **`appsScriptUrl`** in `products.js` and keep **`useNetlifyOrderProxy: false`** (default) so orders POST via the hidden form (§2).

**Optional:** Netlify — same static files plus **`netlify/functions/save-order.mjs`**. Set **`useNetlifyOrderProxy: true`** in `products.js` when you want the server proxy instead of the form.

### GitHub Pages (recommended for this repo)

1. Push your branch (e.g. `main`) to GitHub.
2. Repo **Settings → Pages** → **Build and deployment** → Source: **Deploy from a branch** → Branch **`main`** / folder **`/`** (root) → Save.
3. Keep **`.nojekyll`** in the repo root (already present) so GitHub does not treat the site as a Jekyll project.
4. Set **`appsScriptUrl`** in `products.js` to your Web App `/exec` URL in the copy you publish (see §2). With **`useNetlifyOrderProxy: false`**, no Netlify env vars are required.
5. Project sites load at **`https://<user>.github.io/<repo>/`**. Paths like `products.js` and `catalog.json` are relative to that URL — no extra base path config if `index.html` lives at the repo root.

### Netlify (optional — order proxy)

Use this when you want **`useNetlifyOrderProxy: true`** and the **`save-order`** function (Node handles Google’s redirects; optional if the form POST is enough).

1. **Create the site:** In [Netlify](https://app.netlify.com) → **Add new site → Import an existing project** → connect this GitHub repo.  
   - **Build command:** leave empty (static files only).  
   - **Publish directory:** `/` (repository root), or `.` depending on the UI — the folder that contains `index.html`, `netlify.toml`, and `netlify/functions/`.

2. In **`products.js`:** set **`useNetlifyOrderProxy: true`**, set **`appsScriptUrl`**, and on a **custom domain** set **`orderProxyUrl`** to **`"/.netlify/functions/save-order"`**.

3. **Environment variable (required for the proxy):**  
   - Site → **Site configuration** → **Environment variables**.  
   - **Key:** `APPS_SCRIPT_WEBAPP_URL`  
   - **Value:** your Apps Script Web App `/exec` URL (same value as **`appsScriptUrl`**).  
   - **Scopes:** **All deploy contexts** or at least **Production**.  
   - **Save**, then redeploy so functions pick it up.

4. **Local Netlify dev:** [Netlify CLI](https://docs.netlify.com/cli/get-started/) → `netlify link` → `netlify dev`. Set **`APPS_SCRIPT_WEBAPP_URL`** (linked site or `.env`).

### Netlify Drop (drag & drop)

1. Go to <https://app.netlify.com/drop>.
2. Drag the **project folder** in.
3. For the proxy: set **`useNetlifyOrderProxy: true`** in `products.js`, add **`APPS_SCRIPT_WEBAPP_URL`**, and set **`appsScriptUrl`** before uploading.
4. Netlify gives you a public URL.

### Cloudflare Pages

Same static output as GitHub Pages. Keep **`useNetlifyOrderProxy: false`** and set **`appsScriptUrl`** unless you add a separate worker proxy. Steps:

1. <https://pages.cloudflare.com> → **Create project → Connect to Git**.
2. Build command: *(leave empty)*. Output directory: `/`.
3. Deploy.

---

## 4. How orders flow

1. Customer fills name / phone / address, picks products with `−  qty  +`.
2. Clicks **Place My Order**.
3. Site generates a client-side **Order ID** (`ORD-YYYYMMDD-HHMMSS-XXXX`).
4. POSTs the order JSON to Apps Script → row appended to the `Orders` sheet.
5. Opens `wa.me` with the prefilled order message (including the same Order ID).
6. Owner sees the order on **WhatsApp** and in the **Sheet**.

If the Sheet save fails (offline, quota, etc.) WhatsApp still opens — order never gets lost.

The Apps Script is **idempotent** on Order ID: a duplicate POST with the same Order ID does not create a second row.

---

## 5. Sheet columns

`Timestamp · Order ID · Name · Phone · Address · Delivery Time · Payment · Items · Total · Notes · Status`

Add a data-validation dropdown to the **Status** column manually with values like:
`New, Confirmed, Packed, Out for delivery, Delivered, Cancelled`.

---

## 6. Configuration (`products.js`)

```js
window.SHOP_CONFIG = {
  shopName: "Mangal Provision Super Shop",
  ownerWhatsApp: "919403393688",      // country code, no +, no spaces
  alternatePhone: "+91 88052 65233",
  location: "Pune, Maharashtra",
  appsScriptUrl: "…",                 // Web App /exec URL
  useNetlifyOrderProxy: false,        // true only on Netlify when using save-order proxy
  orderProxyUrl: "",                  // with proxy + custom domain: "/.netlify/functions/save-order"
  catalogUrl: "catalog.json"          // optional; path to product catalog JSON
};
```

**GitHub Pages (default):** keep **`useNetlifyOrderProxy: false`**. Set **`appsScriptUrl`** in the `products.js` you deploy; orders POST to Apps Script via the hidden form (no server env vars).

**Netlify proxy:** set **`useNetlifyOrderProxy: true`**, deploy on Netlify, set **`APPS_SCRIPT_WEBAPP_URL`** to the same **`appsScriptUrl`** string, and set **`orderProxyUrl`** on a custom domain as in §3.

The product catalog lives in **`catalog.json`** (same folder as `index.html` by default). `products.js` loads it with a synchronous request and sets **`window.CATALOG`**. Deploy **`catalog.json`** next to your HTML; use **`catalogUrl`** in config only if the file lives elsewhere.

**Note:** opening `index.html` directly from disk (`file://`) may block loading `catalog.json`; use a local static server (`python3 -m http.server`) or your deployed URL.

---

## 7. Why this stack

- Vanilla JS, no framework, no build → loads fast on cheap Android phones.
- Google Sheet = free database + free admin UI for the owner.
- WhatsApp = the channel customers and the owner already trust.
- All hosting options above are free and require no server.

---

## 8. Future upgrades (not now)

- Order status tracking via owner-only page.
- UPI deep link / Razorpay.
- PDF invoice generation in Apps Script.
- Inventory + analytics in additional Sheet tabs.

The current architecture supports these without rewrites.
