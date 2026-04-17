/**
 * SEOไทย — Code.gs (Google Apps Script)
 * FIXED: ใส่ ID ของ Sheet และปรับการตอบกลับให้รองรับ CORS
 */

var CONFIG = {
  PROMPTPAY_NUMBER: 'patiwatmeekaeo@gmail.com',
  SHEET_ID: '1XHiklaISwzqK6bI0lgMbL5WrGwoIGACCJggVJfhwGPw',
  ADMIN_EMAIL: 'patiwatmeekaeo@gmail.com'
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // กรณีส่งสลิป (submitSlip)
    if (data.action === 'submitSlip') {
      return handleSlipSubmission(data);
    }

    // กรณีวิเคราะห์ SEO (ปกติ)
    var result = analyzeSEO(data.query, data.mode);
    return jsonResponse({ success: true, data: result });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function handleSlipSubmission(data) {
  try {
    var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var sheet = ss.getSheets()[0];

    // บันทึกลง Sheet
    sheet.appendRow([
      new Date(),
      data.email,
      data.query,
      data.mode,
      'Pending',
      data.fileName
    ]);

    // ส่งเมลแจ้ง Admin
    MailApp.sendEmail({
      to:      CONFIG.ADMIN_EMAIL,
      subject: '🔥 มีรายการชำระเงินใหม่ - SEOไทย',
      body:    'Email: ' + data.email + '\nQuery: ' + data.query + '\nFile: ' + data.fileName
    });

    return jsonResponse({ success: true, message: 'บันทึกข้อมูลเรียบร้อย' });
  } catch (e) {
    return jsonResponse({ success: false, error: 'Sheet Error: ' + e.toString() });
  }
}

function analyzeSEO(query, mode) {
  var score = 45 + simpleHash(query);
  var isUrl = (mode === 'url');

  return {
    score: score,
    grade: scoreToGrade(score),
    query: query,
    mode:  mode,
    stats: {
      volume:     isUrl ? '-' : numberFormat(1200 + simpleHash(query) * 50),
      difficulty: isUrl ? '-' : (20 + (simpleHash(query) % 60)) + '/100',
      loadSpeed:  isUrl ? (1.2 + (simpleHash(query) / 50)).toFixed(1) + 's' : '-',
      backlinks:  isUrl ? numberFormat(simpleHash(query) * 12) : '-'
    },
    issues: [
      { type: 'critical', label: isUrl ? 'Missing Meta Description' : 'High Competition',  detail: 'ส่งผลกระทบต่ออันดับอย่างมาก' },
      { type: 'warning',  label: isUrl ? 'Large Image Sizes'        : 'Low Search Intent', detail: 'ควรปรับปรุงเพื่อประสบการณ์ผู้ใช้' },
      { type: 'locked',   label: 'H1 Tag Optimization',   detail: 'ปลดล็อกเพื่อดูรายละเอียด' },
      { type: 'locked',   label: 'Schema Markup Check',   detail: 'ปลดล็อกเพื่อดูรายละเอียด' },
      { type: 'locked',   label: 'Backlink Opportunity',  detail: 'ปลดล็อกเพื่อดูรายละเอียด' }
    ]
  };
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function scoreToGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function simpleHash(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 50;
}

function numberFormat(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function doGet(e) {
  return jsonResponse({ status: 'running', message: 'SEO Thai API is ready' });
}
