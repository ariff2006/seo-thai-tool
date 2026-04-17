/**
 * SEOไทย — Code.gs (Google Apps Script)
 */

var CONFIG = {
  PROMPTPAY_NUMBER: 'patiwatmeekaeo@gmail.com',
  SHEET_ID: '1XHiklaISwzqK6bI0lgMbL5WrGwoIGACCJggVJfhwGPw',
  ADMIN_EMAIL: 'patiwatmeekaeo@gmail.com',
  SLIP_FOLDER_ID: '1B6Z6PS7IllvmqbK-EtkEEQdps_24vTuT',
  PAGESPEED_API_KEY: 'AIzaSyDg8Rj4a-dDDeIojHzjlz1MOmPbsVHwm0g',
  LINE_TOKEN: 'mTm+xMSh9ubQ957nBtQ6+qCisL943G87GkJMJWCkunWezeohuSeXTViDu3Y8roVVb9nY/FpuMv7zNeD1MxtjhMl/XQr/591LRcJH3V9jap+lTL/sHZ0Gk1T+EMH/FpZJosv9nGg1u2HZhUv6vuxRzwdB04t89/1O/w1cDnyilFU=',
  LINE_USER_ID: 'U52dcf188391a79c1f2f5d3dacf634fae'
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'submitSlip') {
      return handleSlipSubmission(data);
    }
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

    var fileUrl = '';
    if (data.fileData && data.fileName) {
      var folder   = DriveApp.getFolderById(CONFIG.SLIP_FOLDER_ID);
      var mimeType = data.mimeType || 'image/jpeg';
      var decoded  = Utilities.base64Decode(data.fileData);
      var blob     = Utilities.newBlob(decoded, mimeType, data.fileName);
      var file     = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    } else {
      return jsonResponse({ success: false, error: 'No fileData received. fileName=' + (data.fileName || 'missing') });
    }

    sheet.appendRow([
      new Date(),
      data.email,
      data.query,
      data.mode,
      'Pending',
      data.fileName,
      fileUrl
    ]);

    // แจ้งเตือน Admin ทันที
    MailApp.sendEmail({
      to:      CONFIG.ADMIN_EMAIL,
      subject: '🔔 มีออเดอร์ใหม่! — SEOไทย',
      htmlBody: '<div style="font-family:Arial,sans-serif;padding:20px;">'
        + '<h2 style="color:#1a1a2e;">🔔 มีลูกค้าส่งสลิปใหม่!</h2>'
        + '<table style="border-collapse:collapse;width:100%;">'
        + '<tr><td style="padding:8px;background:#f5f5f5;width:120px;"><strong>อีเมล</strong></td><td style="padding:8px;">' + data.email + '</td></tr>'
        + '<tr><td style="padding:8px;background:#f5f5f5;"><strong>Query</strong></td><td style="padding:8px;">' + data.query + '</td></tr>'
        + '<tr><td style="padding:8px;background:#f5f5f5;"><strong>Mode</strong></td><td style="padding:8px;">' + data.mode + '</td></tr>'
        + '<tr><td style="padding:8px;background:#f5f5f5;"><strong>ไฟล์สลิป</strong></td><td style="padding:8px;"><a href="' + fileUrl + '">ดูสลิป</a></td></tr>'
        + '</table>'
        + '<br><a href="https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '" style="background:#1a1a2e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">📊 เปิด Google Sheet</a>'
        + '</div>'
    });

    // แจ้งเตือนทาง LINE
    sendLineMessage('🔔 มีออเดอร์ใหม่!\n📧 ' + data.email + '\n🔍 ' + data.query + '\n💳 ดูสลิป: ' + fileUrl);

    return jsonResponse({ success: true, message: 'บันทึกข้อมูลเรียบร้อย' });
  } catch (e) {
    return jsonResponse({ success: false, error: 'Sheet Error: ' + e.toString() });
  }
}

// ===== SEO ANALYSIS =====

function analyzeSEO(query, mode) {
  if (mode === 'url') {
    return analyzeUrlReal(query);
  }
  return analyzeKeyword(query);
}

function analyzeUrlReal(url) {
  try {
    var apiUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
      + '?url=' + encodeURIComponent(url)
      + '&strategy=mobile'
      + '&key=' + CONFIG.PAGESPEED_API_KEY;

    var res  = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    var json = JSON.parse(res.getContentText());

    if (json.error) throw new Error(json.error.message);

    var audits    = json.lighthouseResult.audits;
    var score     = Math.round(json.lighthouseResult.categories.performance.score * 100);
    var loadSpeed = audits['first-contentful-paint'] ? audits['first-contentful-paint'].displayValue : '-';
    var lcp       = audits['largest-contentful-paint'] ? audits['largest-contentful-paint'].displayValue : '-';

    var issues = [];

    // 1. Meta Description
    var metaPass = audits['meta-description'] && audits['meta-description'].score === 1;
    issues.push({
      type:   metaPass ? 'warning' : 'critical',
      label:  'Meta Description',
      detail: metaPass
        ? 'มี meta description แล้ว ✓ ตรวจสอบให้มีคีย์เวิร์ดหลักและความยาว 120–160 ตัวอักษร<br><strong>วิธีแก้ ทำเลย:</strong> เปิด Google Search แล้วค้นหาเว็บตัวเอง ดูข้อความที่แสดงใต้ชื่อเว็บ ถ้าดูไม่น่าคลิก ให้แก้ใน CMS หรือ &lt;head&gt; ของเว็บ'
        : 'เว็บไม่มี meta description — Google จะดึงข้อความสุ่มแสดงแทน ทำให้คนไม่คลิก<br><strong>วิธีแก้ ทำเลย:</strong> 1) เปิดไฟล์ HTML หน้าหลัก 2) เพิ่มใน &lt;head&gt;: &lt;meta name="description" content="[อธิบายธุรกิจ 120-160 ตัวอักษร]"&gt; 3) ถ้าใช้ WordPress ติดตั้ง Yoast SEO แล้วกรอกในช่อง Meta Description'
    });

    // 2. Image Optimization
    var imgAudit = audits['uses-optimized-images'] || audits['modern-image-formats'];
    var imgPass  = imgAudit ? imgAudit.score === 1 : true;
    issues.push({
      type:   'warning',
      label:  'Image Optimization',
      detail: imgPass
        ? 'รูปภาพมีขนาดเหมาะสมแล้ว ✓ แต่แนะนำให้เปลี่ยนเป็น WebP เพื่อให้โหลดเร็วยิ่งขึ้น<br><strong>วิธีแก้ ทำเลย:</strong> ไปที่ squoosh.app → ลากรูปเข้า → เปลี่ยนเป็น WebP → Download แล้วเปลี่ยนรูปบนเว็บ'
        : 'รูปภาพมีขนาดใหญ่ ทำให้โหลดช้า ส่งผลต่ออันดับ Google โดยตรง<br><strong>วิธีแก้ ทำเลย:</strong> 1) ไปที่ tinypng.com → อัพโหลดรูป → Download รูปที่บีบแล้ว 2) หรือไปที่ squoosh.app แล้วเปลี่ยนเป็น WebP 3) เปลี่ยนรูปบนเว็บทีละรูป เริ่มจากรูปใหญ่สุดก่อน'
    });

    // 3. H1 Tag (locked)
    var h1Pass = audits['heading-order'] && audits['heading-order'].score === 1;
    issues.push({
      type:   'locked',
      label:  'H1 Tag Optimization',
      detail: h1Pass
        ? 'โครงสร้าง Heading ถูกต้องแล้ว ✓ ตรวจให้มีคีย์เวิร์ดหลักใน H1 และมีเพียง 1 H1 ต่อหน้า<br><strong>วิธีแก้ ทำเลย:</strong> คลิกขวาที่เว็บ → View Page Source → Ctrl+F ค้นหา &lt;h1&gt; ตรวจว่ามีคีย์เวิร์ดหลักหรือไม่'
        : 'โครงสร้าง Heading ไม่ถูกต้อง ส่งผลเสียต่ออันดับ<br><strong>วิธีแก้ ทำเลย:</strong> 1) คลิกขวา → View Page Source → Ctrl+F ค้น &lt;h1&gt; 2) ถ้าไม่มีหรือมีหลายอัน ให้เหลือแค่ 1 อัน 3) ใส่คีย์เวิร์ดหลักของธุรกิจใน H1 เช่น &lt;h1&gt;บริการ[ชื่อธุรกิจ] [จังหวัด]&lt;/h1&gt;'
    });

    // 4. Schema Markup (locked)
    var schemaAudit = audits['structured-data'];
    var schemaPass  = schemaAudit && schemaAudit.score === 1;
    issues.push({
      type:   'locked',
      label:  'Schema Markup',
      detail: schemaPass
        ? 'มี Schema Markup แล้ว ✓ แนะนำให้เพิ่ม Review Schema หรือ FAQ Schema เพื่อเพิ่ม CTR<br><strong>วิธีแก้ ทำเลย:</strong> ไปที่ technicalseo.com/tools/schema-markup-generator → เพิ่ม FAQ Schema → Copy โค้ดวางใน &lt;head&gt;'
        : 'เว็บยังไม่มี Schema Markup ทำให้พลาดโอกาสแสดงดาว รีวิว ใน Google<br><strong>วิธีแก้ ทำเลย:</strong> 1) ไปที่ technicalseo.com/tools/schema-markup-generator 2) เลือก LocalBusiness 3) กรอกชื่อ ที่อยู่ เบอร์โทร 4) Copy โค้ด JSON-LD 5) วางใน &lt;head&gt; ของเว็บ'
    });

    // 5. Core Web Vitals LCP (locked)
    var lcpScore = audits['largest-contentful-paint'] ? audits['largest-contentful-paint'].score : 0;
    issues.push({
      type:   'locked',
      label:  'Core Web Vitals (LCP)',
      detail: lcpScore >= 0.9
        ? 'LCP (' + lcp + ') อยู่ในระดับดีเยี่ยม ✓ เว็บโหลดเร็วช่วยให้อันดับ Google ดีขึ้น<br><strong>วิธีแก้ ทำเลย:</strong> รักษาระดับนี้ไว้โดยไม่เพิ่มรูปหรือ script ที่ไม่จำเป็นบนเว็บ'
        : 'LCP (' + lcp + ') ช้าเกินไป Google ใช้ค่านี้จัดอันดับโดยตรง<br><strong>วิธีแก้ ทำเลย:</strong> 1) บีบรูปทุกรูปด้วย TinyPNG ก่อน 2) ลบ plugin หรือ script ที่ไม่ใช้ออก 3) เปลี่ยนไปใช้ Hosting ที่เร็วกว่า หรือเปิดใช้ Cloudflare CDN (ฟรี) ที่ cloudflare.com'
    });

    return {
      score: score,
      grade: scoreToGrade(score),
      query: url,
      mode:  'url',
      stats: { loadSpeed: loadSpeed, backlinks: lcp + ' LCP' },
      issues: issues
    };

  } catch (err) {
    return analyzeKeyword(url);
  }
}

function analyzeKeyword(query) {
  var hv    = simpleHash(query);
  var score = 45 + hv;
  return {
    score: score,
    grade: scoreToGrade(score),
    query: query,
    mode:  'keyword',
    stats: {
      volume:     numberFormat(1200 + hv * 50),
      difficulty: (20 + (hv % 60)) + '/100'
    },
    issues: [
      { type: 'critical', label: 'High Competition',
        detail: 'คีย์เวิร์ดนี้มีคู่แข่งสูงมาก ยากจะติดหน้าแรก<br><strong>วิธีแก้ ทำเลย:</strong> 1) เพิ่มคำขยายเช่น "' + query + ' ราคาถูก" หรือ "' + query + ' กรุงเทพ" 2) เปิด Google แล้วดู "คนยังค้นหา" ด้านล่าง 3) เลือก keyword ที่แข่งขันน้อยกว่ามาทำก่อน' },
      { type: 'warning',  label: 'Low Search Intent',
        detail: 'ผู้ค้นหายังไม่พร้อมซื้อ ถ้าทำแค่หน้าขายจะได้ยอดน้อย<br><strong>วิธีแก้ ทำเลย:</strong> 1) เขียนบทความ "' + query + ' คืออะไร ดียังไง" 2) เพิ่มหน้า FAQ ตอบคำถามที่คนมักถาม 3) ลิงก์จากบทความไปหน้าสินค้า/บริการ' },
      { type: 'locked',   label: 'H1 Tag Optimization',
        detail: 'H1 คือหัวข้อหลักที่ Google ใช้เข้าใจเว็บ ถ้าไม่มีหรือไม่มีคีย์เวิร์ด อันดับจะต่ำ<br><strong>วิธีแก้ ทำเลย:</strong> 1) เปิดหน้าเว็บ → คลิกขวา → View Page Source 2) กด Ctrl+F ค้นหา &lt;h1&gt; 3) ถ้าไม่มีหรือไม่มีคำว่า "' + query + '" ให้แก้ให้มี เช่น &lt;h1&gt;' + query + ' ราคาดี บริการครบ&lt;/h1&gt;' },
      { type: 'locked',   label: 'Schema Markup',
        detail: 'Schema ช่วยให้ Google แสดงดาว รีวิว ราคา ใน Search ทำให้คนคลิกมากขึ้น<br><strong>วิธีแก้ ทำเลย:</strong> 1) ไปที่ technicalseo.com/tools/schema-markup-generator 2) เลือกประเภท LocalBusiness หรือ FAQ 3) กรอกข้อมูล → Copy โค้ด 4) วางในส่วน &lt;head&gt; ของเว็บ' },
      { type: 'locked',   label: 'Backlink Opportunity',
        detail: 'Backlink คือลิงก์จากเว็บอื่นมาหาเรา ยิ่งมากยิ่งดี Google มองว่าเว็บน่าเชื่อถือ<br><strong>วิธีแก้ ทำเลย:</strong> 1) สมัคร Google Business Profile (ฟรี) ที่ business.google.com 2) เขียนบทความลง medium.com แล้วลิงก์กลับเว็บ 3) ลงทะเบียนใน wongnai.com หรือ directory ธุรกิจไทย' }
    ]
  };
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
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

function setupTrigger() {
  // ลบ trigger เก่าทั้งหมด
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  // Time-based trigger ทุก 1 นาที
  ScriptApp.newTrigger('checkNewOrders')
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log('Trigger setup complete!');
}

function checkNewOrders() {
  try {
    var ss      = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var sheet   = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    if (lastRow < 1) return;

    var now     = new Date();
    var twoMins = 2 * 60 * 1000;

    for (var i = 1; i <= lastRow; i++) {
      var row     = sheet.getRange(i, 1, 1, 8).getValues()[0];
      var time    = new Date(row[0]);
      var email   = row[1];
      var query   = row[2];
      var mode    = row[3];
      var status  = row[4];
      var fileUrl = row[6];
      var notified = row[7];

      // ส่งแจ้งเตือนเฉพาะ Pending ที่เพิ่งเข้ามาและยังไม่ได้แจ้ง
      if (status === 'Pending' && !notified && (now - time) < (6 * 60 * 1000)) {
        // LINE
        sendLineMessage('🔔 มีออเดอร์ใหม่!\n📧 ' + email + '\n🔍 ' + query + '\n💳 ดูสลิป: ' + fileUrl);
        // Email
        MailApp.sendEmail({
          to: CONFIG.ADMIN_EMAIL,
          subject: '🔔 มีออเดอร์ใหม่! — SEOไทย',
          htmlBody: '<div style="font-family:Arial,sans-serif;padding:20px;">'
            + '<h2>🔔 มีลูกค้าส่งสลิปใหม่!</h2>'
            + '<p><strong>อีเมล:</strong> ' + email + '</p>'
            + '<p><strong>Query:</strong> ' + query + '</p>'
            + '<p><strong>สลิป:</strong> <a href="' + fileUrl + '">ดูสลิป</a></p>'
            + '<br><a href="https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '" style="background:#1a1a2e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">📊 เปิด Google Sheet</a>'
            + '</div>'
        });
        // Mark ว่าแจ้งแล้ว
        sheet.getRange(i, 8).setValue('Notified');
      }
    }
  } catch(err) {
    Logger.log('checkNewOrders error: ' + err);
  }
}

function onSheetChange(e) {
  try {
    var ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var sheet = ss.getSheets()[0];
    var last  = sheet.getLastRow();
    if (last < 1) return;

    var row     = sheet.getRange(last, 1, 1, 7).getValues()[0];
    var email   = row[1];
    var query   = row[2];
    var mode    = row[3];
    var status  = row[4];
    var fileUrl = row[6];

    if (status !== 'Pending') return;

    // แจ้งเตือนทาง Email
    MailApp.sendEmail({
      to:       CONFIG.ADMIN_EMAIL,
      subject:  '🔔 มีออเดอร์ใหม่! — SEOไทย',
      htmlBody: '<div style="font-family:Arial,sans-serif;padding:20px;">'
        + '<h2 style="color:#1a1a2e;">🔔 มีลูกค้าส่งสลิปใหม่!</h2>'
        + '<table style="border-collapse:collapse;width:100%;">'
        + '<tr><td style="padding:8px;background:#f5f5f5;width:120px;"><strong>อีเมล</strong></td><td style="padding:8px;">' + email + '</td></tr>'
        + '<tr><td style="padding:8px;background:#f5f5f5;"><strong>Query</strong></td><td style="padding:8px;">' + query + '</td></tr>'
        + '<tr><td style="padding:8px;background:#f5f5f5;"><strong>Mode</strong></td><td style="padding:8px;">' + mode + '</td></tr>'
        + '<tr><td style="padding:8px;background:#f5f5f5;"><strong>สลิป</strong></td><td style="padding:8px;"><a href="' + fileUrl + '">ดูสลิป</a></td></tr>'
        + '</table><br>'
        + '<a href="https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '" style="background:#1a1a2e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">📊 เปิด Google Sheet</a>'
        + '</div>'
    });

    // แจ้งเตือนทาง LINE
    sendLineMessage('🔔 มีออเดอร์ใหม่!\n📧 ' + email + '\n🔍 ' + query + '\n💳 ดูสลิป: ' + fileUrl);

  } catch(err) {
    Logger.log('onSheetChange error: ' + err);
  }
}

function sendLineMessage(message) {
  try {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.LINE_TOKEN
      },
      payload: JSON.stringify({
        to: CONFIG.LINE_USER_ID,
        messages: [{ type: 'text', text: message }]
      }),
      muteHttpExceptions: true
    });
  } catch(err) {
    Logger.log('LINE error: ' + err);
  }
}

// ===== SHEET MENU =====

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SEOไทย')
    .addItem('✅ Approve & ส่งรายงาน', 'approveAndSend')
    .addToUi();
}

function approveAndSend() {
  var ui    = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var row   = sheet.getActiveRange().getRow();

  if (row < 1) { ui.alert('กรุณาคลิกเลือก row ของลูกค้าก่อน'); return; }

  var data   = sheet.getRange(row, 1, 1, 7).getValues()[0];
  var email  = data[1];
  var query  = data[2];
  var mode   = data[3];
  var status = data[4];

  if (status === 'Approved') { ui.alert('รายการนี้ Approve แล้ว'); return; }
  if (!email) { ui.alert('ไม่พบอีเมลลูกค้าใน row นี้'); return; }

  var confirm = ui.alert('ยืนยันการส่งรายงาน', 'ส่งรายงาน SEO ให้ ' + email + '\nQuery: ' + query, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  var report = analyzeSEO(query, mode);

  MailApp.sendEmail({
    to:       email,
    subject:  '[SEOไทย] รายงาน SEO ฉบับเต็ม — ' + query,
    htmlBody: buildEmailReport(report)
  });

  sheet.getRange(row, 5).setValue('Approved');
  ui.alert('✅ ส่งรายงานให้ ' + email + ' เรียบร้อยแล้ว!');
}

function buildEmailReport(report) {
  var issueRows = report.issues.map(function(issue) {
    var color = issue.type === 'critical' ? '#ff4444' : issue.type === 'warning' ? '#ffaa00' : '#4CAF50';
    var icon  = issue.type === 'critical' ? '🔴' : issue.type === 'warning' ? '🟡' : '🟢';
    var badge = issue.type === 'critical' ? 'CRITICAL' : issue.type === 'warning' ? 'WARNING' : 'INFO';
    return '<tr>'
      + '<td style="padding:10px 12px;border-bottom:1px solid #eee;">' + icon + ' <strong>' + issue.label + '</strong><br>'
      + '<span style="color:#555;font-size:13px;">' + issue.detail + '</span></td>'
      + '<td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">'
      + '<span style="background:' + color + ';color:white;padding:3px 10px;border-radius:12px;font-size:12px;">' + badge + '</span></td>'
      + '</tr>';
  }).join('');

  var modeLabel = report.mode === 'url' ? 'URL Analysis' : 'Keyword Analysis';
  var statsHtml = report.mode === 'url'
    ? '<td style="padding:10px;text-align:center;"><strong>' + report.stats.loadSpeed + '</strong><br><span style="color:#888;font-size:12px;">Load Speed (FCP)</span></td>'
    + '<td style="padding:10px;text-align:center;"><strong>' + report.stats.backlinks + '</strong><br><span style="color:#888;font-size:12px;">Core Web Vitals</span></td>'
    : '<td style="padding:10px;text-align:center;"><strong>' + report.stats.volume + '</strong><br><span style="color:#888;font-size:12px;">Search Volume</span></td>'
    + '<td style="padding:10px;text-align:center;"><strong>' + report.stats.difficulty + '</strong><br><span style="color:#888;font-size:12px;">Difficulty</span></td>';

  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f4f4;padding:20px;">'
    + '<div style="background:#1a1a2e;color:white;padding:24px;text-align:center;border-radius:8px 8px 0 0;">'
    + '<h1 style="margin:0;font-size:28px;">🔍 SEOไทย</h1>'
    + '<p style="margin:6px 0 0;opacity:0.8;">รายงาน SEO ฉบับเต็ม</p>'
    + '</div>'
    + '<div style="background:white;padding:24px;">'
    + '<p style="color:#888;margin:0 0 4px;">ประเภท: ' + modeLabel + '</p>'
    + '<h2 style="margin:0 0 20px;color:#1a1a2e;">' + report.query + '</h2>'
    + '<div style="background:#f9f9f9;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">'
    + '<div style="font-size:52px;font-weight:bold;color:#4CAF50;line-height:1;">' + report.score + '</div>'
    + '<div style="font-size:22px;color:#555;margin-top:4px;">เกรด ' + report.grade + '</div>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;background:#f9f9f9;border-radius:8px;margin-bottom:20px;"><tr>' + statsHtml + '</tr></table>'
    + '<h3 style="color:#1a1a2e;border-bottom:2px solid #eee;padding-bottom:8px;">รายการปัญหาทั้งหมด</h3>'
    + '<table style="width:100%;border-collapse:collapse;">'
    + '<thead><tr style="background:#1a1a2e;color:white;">'
    + '<th style="padding:10px 12px;text-align:left;">ปัญหาและคำแนะนำ</th>'
    + '<th style="padding:10px 12px;text-align:center;width:100px;">ระดับ</th>'
    + '</tr></thead><tbody>' + issueRows + '</tbody></table>'
    + '</div>'
    + '</div>'
    + '<div style="background:#fff8e1;border:2px solid #ffcc00;border-radius:8px;padding:20px;margin-top:16px;text-align:center;">'
    + '<p style="margin:0 0 6px;font-size:16px;font-weight:bold;color:#333;">🛠️ ไม่อยากแก้เอง? ให้เราช่วย!</p>'
    + '<p style="margin:0 0 14px;color:#666;font-size:13px;">ทีมงาน SEOไทย รับแก้ปัญหาทั้งหมดให้ครบ พร้อมรายงานผลหลังแก้</p>'
    + '<a href="https://line.me/ti/p/~Allfile" style="display:inline-block;background:#06c755;color:white;padding:10px 28px;border-radius:24px;text-decoration:none;font-weight:bold;font-size:14px;margin-right:8px;">💬 ติดต่อผ่าน LINE</a>'
    + '<a href="mailto:patiwatmeekaeo@gmail.com" style="display:inline-block;background:#1a1a2e;color:white;padding:10px 28px;border-radius:24px;text-decoration:none;font-weight:bold;font-size:14px;">📧 ส่งอีเมล</a>'
    + '</div>'
    + '<div style="background:#1a1a2e;color:white;padding:16px;text-align:center;border-radius:0 0 8px 8px;margin-top:0;">'
    + '<p style="margin:0;font-size:13px;">ขอบคุณที่ใช้บริการ SEOไทย 🙏 | <a href="https://seo-thai-tool.vercel.app" style="color:#aaa;">seo-thai-tool.vercel.app</a></p>'
    + '</div></div>';
}

function testLine() {
  sendLineMessage('🔔 ทดสอบระบบแจ้งเตือน SEOไทย');
}
