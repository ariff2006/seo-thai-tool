/**
 * SEOไทย — Code.gs (Google Apps Script)
 * ══════════════════════════════════════════════════════════
 * Deploy as: Web App → Execute as: Me → Who has access: Anyone
 *
 * This script acts as a secure API bridge between the frontend
 * and any third-party SEO APIs (or mock data for MVP phase).
 *
 * ENDPOINTS
 *  GET  ?action=ping                → Health check
 *  POST { query, mode }             → Return SEO analysis mock data
 *  POST { action:"submitSlip", ... }→ Receive payment slip + email
 *
 * HOW TO DEPLOY
 *  1. Go to script.google.com → New Project
 *  2. Paste this code
 *  3. Click Deploy → New Deployment → Web App
 *  4. Set Execute as: "Me", Access: "Anyone"
 *  5. Copy the /exec URL and paste it into CONFIG.GAS_URL in script.js
 *  6. Set CONFIG.USE_LOCAL_MOCK = false in script.js
 * ══════════════════════════════════════════════════════════
 */

/* ── CONFIG ───────────────────────────────────────────── */
var CONFIG = {
  // Replace with your real PromptPay number (phone or ID card)
  PROMPTPAY_NUMBER: 'patiwatmeekaeo@gmail.com',

  // Spreadsheet ID to log submissions (create a Google Sheet, paste ID here)
  // ชื่อ Sheet: seo-thai-tool — หา ID จาก URL ของ Sheet แล้วใส่ตรงนี้
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',

  // Email to receive slip notifications
  ADMIN_EMAIL: 'patiwatmeekaeo@gmail.com',

  // Allowed origins for CORS (your Vercel domain)
  ALLOWED_ORIGIN: '*', // tighten in production e.g. 'https://your-app.vercel.app'

  // Price in THB
  PRICE_THB: 30,
};

/* ══════════════════════════════════════════════════════════
   GET HANDLER — ?action=ping
═══════════════════════════════════════════════════════════ */
function doGet(e) {
  var action = e.parameter.action || '';

  if (action === 'ping') {
    return jsonResponse({ status: 'ok', message: 'SEOไทย API is alive 🟢' });
  }

  // Also allow GET-based analysis (for simple testing in browser)
  if (e.parameter.query) {
    var query = e.parameter.query;
    var mode  = e.parameter.mode || detectMode(query);
    var data  = getAnalysisData(query, mode);
    return jsonResponse(data);
  }

  return jsonResponse({ status: 'error', message: 'Invalid request. Use POST with { query, mode }.' });
}

/* ══════════════════════════════════════════════════════════
   POST HANDLER — Main entry point
═══════════════════════════════════════════════════════════ */
function doPost(e) {
  try {
    var body = {};

    // Parse JSON body
    if (e.postData && e.postData.type === 'application/json') {
      body = JSON.parse(e.postData.contents);
    } else if (e.postData && e.postData.type === 'multipart/form-data') {
      // FormData (slip submission)
      body = e.parameter;
    }

    var action = body.action || 'analyze';

    if (action === 'submitSlip') {
      return handleSlipSubmission(body, e);
    }

    // Default: analysis
    var query = body.query || '';
    var mode  = body.mode  || detectMode(query);

    if (!query) {
      return jsonResponse({ status: 'error', message: 'Missing query parameter' });
    }

    var data = getAnalysisData(query, mode);
    return jsonResponse(data);

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

/* ══════════════════════════════════════════════════════════
   ANALYSIS DATA (Mock MVP — replace with real API calls)
═══════════════════════════════════════════════════════════ */
function getAnalysisData(query, mode) {
  if (mode === 'url') {
    return getUrlAnalysis(query);
  } else {
    return getKeywordAnalysis(query);
  }
}

/* ── KEYWORD ANALYSIS MOCK ──────────────────────────── */
function getKeywordAnalysis(query) {
  // In production: call DataForSEO API, Moz API, or similar
  // For MVP: return deterministic mock data based on query hash

  var hash    = simpleHash(query);
  var score   = 45 + (hash % 50);          // 45-95
  var volume  = 500 + (hash % 50) * 450;   // 500-22,950
  var diff    = 20 + (hash % 70);          // 20-90
  var cpc     = (5 + (hash % 60)) / 4;     // ฿1.25-฿16.25
  var grade   = scoreToGrade(score);

  return {
    type:  'keyword',
    query: query,
    score: score,
    grade: grade,
    stats: [
      { label: 'Search Volume',      value: numberFormat(volume) + '/เดือน', color: 'gold'  },
      { label: 'Keyword Difficulty', value: diff + '/100',                   color: diff > 60 ? 'red' : diff > 40 ? 'amber' : 'green' },
      { label: 'CPC (บาท)',          value: '฿' + cpc.toFixed(2),           color: 'green' },
      { label: 'Competition',        value: diff > 60 ? 'High' : diff > 35 ? 'Medium' : 'Low', color: diff > 60 ? 'red' : 'amber' },
    ],
    issues: [
      {
        severity: 'high',
        icon: '🎯',
        title: 'ความยากสูง — ต้องใช้ Domain Authority สูง',
        desc:  'คีย์เวิร์ดนี้มีความยาก ' + diff + '/100 เว็บไซต์ใหม่จะแข่งขันลำบาก ควรเริ่มจาก long-tail keyword ก่อน',
      },
      {
        severity: 'medium',
        icon: '📊',
        title: 'Search Intent — Mixed Intent',
        desc:  'ผู้ค้นหามีความต้องการหลากหลาย ทั้ง informational และ transactional ควรสร้างเนื้อหาที่ครอบคลุมทั้งสองด้าน',
      },
      {
        severity: 'medium',
        icon: '🔗',
        title: 'ต้องการ Backlink อย่างน้อย ' + (30 + hash % 40) + ' โดเมน',
        desc:  'คู่แข่งหน้าแรกมี Referring Domains เฉลี่ยสูง คุณจำเป็นต้องสร้าง backlink คุณภาพสูงอย่างต่อเนื่อง',
      },
      {
        severity: 'low',
        icon: '📝',
        title: 'ความยาวเนื้อหาที่แนะนำ: ' + (1200 + (hash % 12) * 100) + '+ คำ',
        desc:  'บทความที่ติดหน้าแรกของ Google ในหมวดนี้มีความยาวเฉลี่ยสูง ควรสร้างเนื้อหาเชิงลึกและครอบคลุม',
      },
      {
        severity: 'low',
        icon: '💡',
        title: 'Long-tail โอกาสทอง: ' + (4 + hash % 10) + ' คีย์เวิร์ดที่เกี่ยวข้อง',
        desc:  'มีคีย์เวิร์ดลูกที่ความยากต่ำกว่า 30/100 เหมาะสำหรับเว็บไซต์ที่เพิ่งเริ่มต้น',
      },
      {
        severity: 'info',
        icon: '📅',
        title: 'Trend Analysis — ตรวจสอบ Seasonal Pattern',
        desc:  'ข้อมูล Trend แสดงรูปแบบการค้นหาตามฤดูกาล ควรวางแผนเนื้อหาล่วงหน้าอย่างน้อย 2 เดือน',
      },
    ],
  };
}

/* ── URL / ON-PAGE ANALYSIS MOCK ────────────────────── */
function getUrlAnalysis(url) {
  // In production: call Google PageSpeed Insights API, custom crawler, etc.
  var hash   = simpleHash(url);
  var speed  = 30 + (hash % 60);    // 30-90
  var mobile = 35 + (hash % 55);    // 35-90
  var score  = Math.round((speed + mobile) / 2);
  var grade  = scoreToGrade(score);

  return {
    type:  'url',
    query: url,
    score: score,
    grade: grade,
    stats: [
      { label: 'Page Speed',    value: speed  + '/100', color: speed  > 70 ? 'green' : speed  > 50 ? 'amber' : 'red' },
      { label: 'Mobile Score',  value: mobile + '/100', color: mobile > 70 ? 'green' : mobile > 50 ? 'amber' : 'red' },
      { label: 'ปัญหา Critical', value: (2 + hash % 4) + ' รายการ', color: 'red' },
      { label: 'ปัญหาทั้งหมด',   value: (6 + hash % 5) + ' รายการ', color: 'gold' },
    ],
    issues: [
      {
        severity: 'high',
        icon: '🏷️',
        title: 'Title Tag มีปัญหา — เกินขีดจำกัดหรือขาดหาย',
        desc:  'Title ที่ดีควรมีความยาว 50-60 ตัวอักษร และมี Primary Keyword อยู่ในส่วนต้น',
      },
      {
        severity: 'high',
        icon: '⚡',
        title: 'Page Speed ช้า — LCP เกิน 2.5 วินาที',
        desc:  'Largest Contentful Paint เกิน Core Web Vitals threshold ส่งผลต่อ Google Ranking โดยตรง',
      },
      {
        severity: 'high',
        icon: '📱',
        title: 'Mobile Optimization ไม่ผ่าน',
        desc:  'Google ใช้ Mobile-First Indexing หน้าเว็บที่แสดงผลบนมือถือไม่ดีจะส่งผลต่ออันดับ',
      },
      {
        severity: 'medium',
        icon: '🖼️',
        title: 'รูปภาพขาด Alt Text',
        desc:  'รูปภาพที่ไม่มี alt text ทำให้เสียโอกาสในการค้นหาจาก Google Images',
      },
      {
        severity: 'medium',
        icon: '🔗',
        title: 'พบ Broken Links ในหน้า',
        desc:  'ลิงก์เสียส่งผลเสียต่อ User Experience และ Crawl Budget ของ Googlebot',
      },
      {
        severity: 'low',
        icon: '📄',
        title: 'Meta Description ขาดหายหรือซ้ำกัน',
        desc:  'Meta Description ที่ดีช่วยเพิ่ม CTR ในผลการค้นหาได้อย่างมีนัยสำคัญ',
      },
      {
        severity: 'low',
        icon: '🏗️',
        title: 'โครงสร้าง Heading ไม่เป็นลำดับ',
        desc:  'ควรมี H1 เพียงอันเดียว และใช้ H2/H3 เป็นลำดับ เพื่อให้ Crawler อ่านโครงสร้างได้',
      },
      {
        severity: 'info',
        icon: '🔒',
        title: 'แนะนำ: เพิ่ม Schema Markup',
        desc:  'Structured Data ช่วยให้ Google แสดง Rich Snippets เพิ่ม CTR ได้ถึง 30%',
      },
    ],
  };
}

/* ══════════════════════════════════════════════════════════
   SLIP SUBMISSION HANDLER
═══════════════════════════════════════════════════════════ */
function handleSlipSubmission(body, e) {
  var email = body.email || 'unknown@email.com';
  var query = body.query || '';
  var mode  = body.mode  || '';
  var ts    = new Date().toISOString();

  // 1. Log to Google Sheet
  try {
    var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var sheet = ss.getSheetByName('Submissions') || ss.insertSheet('Submissions');

    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Email', 'Query', 'Mode', 'Status', 'Notes']);
    }
    sheet.appendRow([ts, email, query, mode, 'PENDING_REVIEW', '']);
  } catch (sheetErr) {
    Logger.log('Sheet error: ' + sheetErr.message);
    // Non-fatal: continue even if sheet logging fails
  }

  // 2. Send admin email notification
  try {
    var subject = '💳 SEOไทย — สลิปใหม่ จาก ' + email;
    var body_html = '<h3>มีการส่งสลิปใหม่</h3>'
      + '<p><b>เวลา:</b> ' + ts + '</p>'
      + '<p><b>อีเมล:</b> ' + email + '</p>'
      + '<p><b>Query:</b> ' + query + '</p>'
      + '<p><b>Mode:</b> ' + mode + '</p>'
      + '<p>กรุณาตรวจสอบและส่งรายงานฉบับเต็มให้ลูกค้า</p>';

    GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, '', { htmlBody: body_html });
  } catch (mailErr) {
    Logger.log('Email error: ' + mailErr.message);
  }

  // 3. Send confirmation to customer
  try {
    var confirmSubject = '✅ SEOไทย — เราได้รับสลิปของคุณแล้ว';
    var confirmBody    = 'สวัสดี!\n\n'
      + 'เราได้รับสลิปการชำระเงินของคุณแล้ว\n'
      + 'รายงาน SEO ฉบับเต็มสำหรับ "' + query + '" จะถูกส่งไปยังอีเมลนี้ภายใน 30 นาที\n\n'
      + 'ขอบคุณที่ใช้บริการ SEOไทย 🙏\n'
      + 'ทีม SEOไทย';

    GmailApp.sendEmail(email, confirmSubject, confirmBody);
  } catch (mailErr) {
    Logger.log('Confirm email error: ' + mailErr.message);
  }

  return jsonResponse({
    status:  'success',
    message: 'สลิปได้รับแล้ว รายงานจะส่งไปยัง ' + email + ' ภายใน 30 นาที',
  });
}

/* ══════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════ */

/**
 * Detect whether a query is a URL or a keyword
 */
function detectMode(query) {
  var urlPattern = /^(https?:\/\/|www\.)[^\s]+/i;
  return urlPattern.test(query.trim()) ? 'url' : 'keyword';
}

/**
 * Convert score to letter grade
 */
function scoreToGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Simple deterministic hash for mock data variation
 */
function simpleHash(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var chr  = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Format large numbers with commas
 */
function numberFormat(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Return a JSON ContentService response with CORS headers
 */
function jsonResponse(data) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/* ══════════════════════════════════════════════════════════
   TEST FUNCTION (run from Apps Script editor to verify)
═══════════════════════════════════════════════════════════ */
function testKeyword() {
  var result = getKeywordAnalysis('ร้านอาหารไทย กรุงเทพ');
  Logger.log(JSON.stringify(result, null, 2));
}

function testUrl() {
  var result = getUrlAnalysis('https://example.co.th');
  Logger.log(JSON.stringify(result, null, 2));
}
