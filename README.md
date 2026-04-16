# SEOไทย — Thai SEO Tool MVP

**Engineering as Marketing · Freemium · PromptPay Micro-transaction**

---

## 📁 File Structure

```
thai-seo-tool/
├── index.html   ← Single Page App (drop on Vercel)
├── style.css    ← Dark tech-luxury Thai gold theme
├── script.js    ← Auto-detect, API calls, paywall, payment flow
└── Code.gs      ← Google Apps Script backend (mock → real API)
```

---

## 🚀 Deployment (Vercel — Free)

1. Go to [vercel.com](https://vercel.com) → Sign up / Log in
2. Click **Add New → Project → drag-and-drop** your folder
3. Vercel auto-detects static HTML — click **Deploy**
4. Done! Your site is live at `your-project.vercel.app`

---

## ⚙️ Google Apps Script Setup

1. Go to [script.google.com](https://script.google.com) → **New Project**
2. Paste `Code.gs` content (replace the default code)
3. Update `CONFIG` at the top of `Code.gs`:
   - `PROMPTPAY_NUMBER` → your PromptPay phone/ID
   - `SHEET_ID` → your Google Sheets ID (for logging)
   - `ADMIN_EMAIL` → your notification email
4. Click **Deploy → New Deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the `/exec` URL
6. In `script.js`, set:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/YOUR_ID/exec',
   USE_LOCAL_MOCK: false,
   ```

---

## 🧪 MVP Mode (No GAS needed)

By default, `USE_LOCAL_MOCK: true` in `script.js`.  
The app works 100% offline with rich mock data — perfect for demos.

---

## 💳 Payment Flow

| Step | What Happens |
|------|-------------|
| User clicks "ปลดล็อก" | Modal opens with PromptPay QR |
| User pays ฿30 | Scans QR, transfers via banking app |
| User uploads slip | Attaches screenshot/photo of transfer |
| GAS receives slip | Logs to Google Sheets, emails admin |
| Admin sends report | Manually sends full PDF report within 30 min |

---

## 🔌 Real API Integration (Post-MVP)

Replace mock functions in `Code.gs` with real calls:

| Feature | Recommended API |
|---------|----------------|
| Keyword Volume/Difficulty | DataForSEO, Moz, Ahrefs |
| Page Speed | Google PageSpeed Insights (free) |
| Technical SEO Audit | Screaming Frog API, SEMrush |
| Backlink Data | Moz Link Explorer, Majestic |

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Background | `#0d0f1a` |
| Surface | `#141627` |
| Gold Accent | `#f5c842` |
| Font | Sarabun (TH+EN) + Space Mono |
| Radius | 14px / 22px / 32px |
