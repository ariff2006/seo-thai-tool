/**
 * SEOไทย — script.js
 * ─────────────────────────────────────────────────────────
 * Flow:
 *  1. User types → auto-detect mode (keyword / url)
 *  2. Click "วิเคราะห์" → show loading → POST to GAS API
 *  3. Render score card + first 2 issues (free) + blurred rest
 *  4. Paywall CTA → payment modal (QR → upload slip → submit)
 * ─────────────────────────────────────────────────────────
 * CONFIG: Replace GAS_URL with your deployed Apps Script URL
 */

const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzpqyJy75R8re8WXj5JJEh8wpuWaLnkg7zzzispt2Zf2nIRBlIUQajqR6_y2LIXX8dTtg/exec',
  USE_LOCAL_MOCK: false,
  FREE_ISSUE_COUNT: 2,
};

/* ═══════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════ */
const state = {
  mode: 'idle',        // 'idle' | 'keyword' | 'url'
  query: '',
  results: null,
  uploadedFile: null,
};

/* ═══════════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const $q = sel => document.querySelector(sel);

/* ═══════════════════════════════════════════════════
   AUTO-DETECT MODE
═══════════════════════════════════════════════════ */
function detectMode(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'idle';
  const urlPattern = /^(https?:\/\/|www\.)[^\s]+/i;
  return urlPattern.test(trimmed) ? 'url' : 'keyword';
}

function updateModeBadge(mode) {
  const badge = $('modeBadge');
  const icon  = $('modeIcon');
  const label = $('modeLabel');
  const bar   = $('searchBar');

  badge.className = 'mode-badge';
  bar.className   = 'search-bar';

  if (mode === 'keyword') {
    badge.classList.add('keyword');
    icon.textContent  = '🔑';
    label.textContent = 'วิเคราะห์คีย์เวิร์ด';
  } else if (mode === 'url') {
    badge.classList.add('url');
    bar.classList.add('url-mode');
    icon.textContent  = '🌐';
    label.textContent = 'ตรวจสอบ On-Page SEO';
  } else {
    icon.textContent  = '🔍';
    label.textContent = 'พร้อมรับข้อมูล';
  }
  state.mode = mode;
}

// Live input listener
$('searchInput').addEventListener('input', e => {
  const mode = detectMode(e.target.value);
  updateModeBadge(mode);
});

$('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAnalyze();
});

/* ═══════════════════════════════════════════════════
   EXAMPLE CHIPS
═══════════════════════════════════════════════════ */
function setExample(text) {
  $('searchInput').value = text;
  const mode = detectMode(text);
  updateModeBadge(mode);
  $('searchInput').focus();
}

/* ═══════════════════════════════════════════════════
   ANALYZE HANDLER
═══════════════════════════════════════════════════ */
async function handleAnalyze() {
  const query = $('searchInput').value.trim();
  if (!query) {
    shakeInput();
    return;
  }

  const mode = detectMode(query);
  if (mode === 'idle') { shakeInput(); return; }

  state.query = query;
  updateModeBadge(mode);

  showLoading(mode);
  hideResults();

  try {
    const data = await fetchAnalysis(query, mode);
    state.results = data;
    await simulateLoadingSteps();
    hideLoading();
    renderResults(data, mode);
    showResults();
  } catch (err) {
    hideLoading();
    showError(err.message);
  }
}

function shakeInput() {
  const bar = $('searchBar');
  bar.style.animation = 'none';
  bar.offsetHeight; // reflow
  bar.style.animation = 'shake 0.4s ease';
  setTimeout(() => { bar.style.animation = ''; }, 400);
}

/* Inject shake keyframe once */
(function injectShake() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-8px)}
      40%{transform:translateX(8px)}
      60%{transform:translateX(-5px)}
      80%{transform:translateX(5px)}
    }
  `;
  document.head.appendChild(style);
})();

/* ═══════════════════════════════════════════════════
   API / MOCK
═══════════════════════════════════════════════════ */
async function fetchAnalysis(query, mode) {
  if (CONFIG.USE_LOCAL_MOCK) {
    await sleep(400); // simulate latency
    return mode === 'url' ? mockUrlData(query) : mockKeywordData(query);
  }

const res = await fetch(CONFIG.GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ query, mode }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();

  if (data.status === 'error') throw new Error(data.message || 'API error');

  if (!data.issues || !Array.isArray(data.issues)) {
    throw new Error('รูปแบบข้อมูลจาก API ไม่ถูกต้อง');
  }

  return data;

if (!res.ok) throw new Error(`API error: ${res.status}`);
const data = await res.json();
if (data.status === 'error') throw new Error(data.message || 'API error');
return data;

/* ── LOCAL MOCK DATA ──────────────────────────────── */
function mockKeywordData(query) {
  return {
    type: 'keyword',
    query,
    score: 62,
    grade: 'B-',
    stats: [
      { label: 'Search Volume', value: '12,400', color: 'gold' },
      { label: 'Keyword Difficulty', value: '58/100', color: 'amber' },
      { label: 'CPC (บาท)', value: '฿14.50', color: 'green' },
      { label: 'Competition', value: 'Medium', color: 'amber' },
    ],
    issues: [
      {
        severity: 'high',
        icon: '🎯',
        title: 'ความยากสูง — ต้องใช้ Domain Authority สูง',
        desc: 'คีย์เวิร์ดนี้มีความยาก 58/100 เว็บไซต์ใหม่จะแข่งขันลำบาก ควรเริ่มจาก long-tail keyword ก่อน',
      },
      {
        severity: 'medium',
        icon: '📊',
        title: 'Search Intent ไม่ชัดเจน — Mixed Intent',
        desc: 'ผู้ค้นหามีความต้องการหลากหลาย ทั้ง informational และ transactional ควรสร้างเนื้อหาที่ครอบคลุมทั้งสองด้าน',
      },
      {
        severity: 'medium',
        icon: '🔗',
        title: 'ต้องการ Backlink อย่างน้อย 45 โดเมน',
        desc: 'คู่แข่งหน้าแรกมี Referring Domains เฉลี่ย 45+ โดเมน คุณจำเป็นต้องสร้าง backlink คุณภาพสูง',
      },
      {
        severity: 'low',
        icon: '📝',
        title: 'ความยาวเนื้อหาที่แนะนำ: 1,800+ คำ',
        desc: 'บทความที่ติดหน้าแรกของ Google ในหมวดนี้มีความยาวเฉลี่ย 1,847 คำ ควรสร้างเนื้อหาเชิงลึก',
      },
      {
        severity: 'info',
        icon: '💡',
        title: 'Long-tail โอกาสทอง: 8 คีย์เวิร์ดที่เกี่ยวข้อง',
        desc: 'มีคีย์เวิร์ดลูกอีก 8 คำที่ความยากต่ำกว่า 30/100 และ Volume รวม 3,200/เดือน',
      },
      {
        severity: 'info',
        icon: '📅',
        title: 'Seasonal Trend — ปริมาณการค้นหาสูงขึ้น 40% ในไตรมาส Q4',
        desc: 'ข้อมูล Trend แสดงว่าคีย์เวิร์ดนี้มียอดค้นหาเพิ่มขึ้นอย่างมีนัยสำคัญในช่วงปลายปี ควรวางแผนเนื้อหาล่วงหน้า',
      },
    ],
  };
}

function mockUrlData(query) {
  return {
    type: 'url',
    query,
    score: 47,
    grade: 'C+',
    stats: [
      { label: 'Page Speed', value: '54/100', color: 'amber' },
      { label: 'Mobile Score', value: '61/100', color: 'amber' },
      { label: 'ปัญหา Critical', value: '3 รายการ', color: 'red' },
      { label: 'ปัญหาทั้งหมด', value: '9 รายการ', color: 'gold' },
    ],
    issues: [
      {
        severity: 'high',
        icon: '🏷️',
        title: 'ไม่พบ Title Tag ที่ถูกต้อง',
        desc: 'Title ยาว 78 ตัวอักษร (เกินขีดจำกัด 60 ตัว) Google จะตัดทอนในผลการค้นหา ส่งผลให้ CTR ลดลง',
      },
      {
        severity: 'high',
        icon: '⚡',
        title: 'Page Speed ช้ามาก — LCP 4.2 วินาที',
        desc: 'Largest Contentful Paint (LCP) ของคุณคือ 4.2 วินาที เกิน Core Web Vitals threshold ที่ 2.5 วินาที',
      },
      {
        severity: 'high',
        icon: '📱',
        title: 'Viewport Meta Tag หายไป',
        desc: 'หน้าเว็บไม่มีการกำหนด viewport ทำให้แสดงผลบนมือถือไม่ถูกต้อง Google ให้ความสำคัญกับ Mobile-First Indexing',
      },
      {
        severity: 'medium',
        icon: '🖼️',
        title: 'รูปภาพ 12 รูปไม่มี Alt Text',
        desc: 'รูปภาพที่ไม่มี alt text ทำให้ Google Crawler ไม่เข้าใจบริบทของภาพ เสียโอกาสในการค้นหาจาก Google Images',
      },
      {
        severity: 'medium',
        icon: '🔗',
        title: 'พบ Broken Links 3 รายการ',
        desc: 'มีลิงก์เสียอยู่ในหน้าเว็บที่ชี้ไปยัง 404 errors ซึ่งส่งผลเสียต่อประสบการณ์ผู้ใช้และคะแนน SEO',
      },
      {
        severity: 'low',
        icon: '📄',
        title: 'Meta Description ขาดหาย',
        desc: 'ไม่พบ Meta Description ในหน้านี้ Google อาจเลือกข้อความแบบสุ่มจากหน้าเว็บ ทำให้ CTR ในผลการค้นหาต่ำ',
      },
      {
        severity: 'low',
        icon: '🏗️',
        title: 'โครงสร้าง Heading ไม่ถูกต้อง',
        desc: 'พบ H1 สองอันในหน้าเดียว และขาด H2/H3 ที่เป็นลำดับ ทำให้ crawler อ่านโครงสร้างเนื้อหาได้ยาก',
      },
      {
        severity: 'info',
        icon: '🔒',
        title: 'ไม่มี Schema Markup',
        desc: 'การเพิ่ม Structured Data (Schema.org) จะช่วยให้ Google แสดง Rich Snippets เพิ่ม CTR ได้ถึง 30%',
      },
      {
        severity: 'info',
        icon: '🗺️',
        title: 'ไม่พบ XML Sitemap',
        desc: 'Sitemap ช่วยให้ Googlebot ค้นพบและ Index หน้าใหม่ๆ ได้เร็วขึ้น แนะนำให้สร้างและ Submit ใน Google Search Console',
      },
    ],
  };
}

/* ═══════════════════════════════════════════════════
   LOADING STATE
═══════════════════════════════════════════════════ */
function showLoading(mode) {
  $('loadingSection').style.display = 'block';
  $('loadingIcon').textContent = mode === 'url' ? '🌐' : '🔑';
  $('loadingText').textContent = mode === 'url' ? 'กำลังวิเคราะห์เว็บไซต์...' : 'กำลังวิเคราะห์คีย์เวิร์ด...';
  // Reset steps
  ['step1','step2','step3'].forEach(id => {
    const el = $(id);
    el.className = 'step-item';
  });
  $('step1').classList.add('active');
  $('featuresStrip').style.display = 'none';
}

function hideLoading() { $('loadingSection').style.display = 'none'; }

async function simulateLoadingSteps() {
  await sleep(600);
  $('step1').classList.remove('active');
  $('step1').classList.add('done');
  $('step2').classList.add('active');
  await sleep(600);
  $('step2').classList.remove('active');
  $('step2').classList.add('done');
  $('step3').classList.add('active');
  await sleep(500);
  $('step3').classList.remove('active');
  $('step3').classList.add('done');
  await sleep(200);
}

/* ═══════════════════════════════════════════════════
   RESULTS RENDERING
═══════════════════════════════════════════════════ */
function renderResults(data, mode) {
  const { score, grade, stats, issues, query, type } = data;

  // Header
  const typeBadge = $('resultsTypeBadge');
  typeBadge.textContent  = type === 'url' ? 'On-Page SEO Check' : 'Keyword Analysis';
  typeBadge.className    = 'results-type-badge' + (type === 'url' ? ' url-mode' : '');
  $('resultsQuery').textContent = query.length > 50 ? query.slice(0, 47) + '…' : query;

  // Score circle
  animateScore(score, grade);

  // Stats
  const statsContainer = $('scoreStats');
  statsContainer.innerHTML = stats.map(s => `
    <div class="stat-item">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value ${s.color || ''}">${s.value}</div>
    </div>
  `).join('');

  // Issue count
  $('issueCount').textContent = `${issues.length} รายการ`;

  // Split: free vs locked
  const free   = issues.slice(0, CONFIG.FREE_ISSUE_COUNT);
  const locked = issues.slice(CONFIG.FREE_ISSUE_COUNT);

  // Free issues
  $('freeIssues').innerHTML = free.map((issue, i) =>
    renderIssueCard(issue, i + 1)
  ).join('');

  // Blurred locked issues
  $('blurredIssues').innerHTML = locked.map((issue, i) =>
    renderIssueCard(issue, i + CONFIG.FREE_ISSUE_COUNT + 1)
  ).join('');

  // Locked count in paywall
  $('lockedCount').textContent = locked.length;
}

function renderIssueCard(issue, num) {
  return `
    <div class="issue-card severity-${issue.severity}" style="animation-delay:${(num-1)*0.08}s">
      <span class="issue-number">${num}</span>
      <span class="issue-icon">${issue.icon}</span>
      <div class="issue-body">
        <div class="issue-header">
          <span class="issue-title">${issue.title}</span>
          <span class="severity-badge sev-${issue.severity}">${severityLabel(issue.severity)}</span>
        </div>
        <div class="issue-desc">${issue.desc}</div>
      </div>
    </div>
  `;
}

function severityLabel(sev) {
  return { high: 'สูง', medium: 'กลาง', low: 'ต่ำ', info: 'แนะนำ' }[sev] || sev;
}

/* ── SCORE ANIMATION ──────────────────────────────── */
function animateScore(score, grade) {
  const circumference = 2 * Math.PI * 52; // r=52
  const arc = $('scoreArc');

  // Color
  arc.className = 'score-arc ' + (score >= 70 ? 'green' : score >= 50 ? 'amber' : 'red');

  // Animate number
  let current = 0;
  const duration = 1200;
  const start = performance.now();
  const el = $('scoreNumber');

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // cubic ease out
    current = Math.round(ease * score);
    el.textContent = current;
    // Arc
    const filled = (ease * score / 100) * circumference;
    arc.setAttribute('stroke-dasharray', `${filled} ${circumference - filled}`);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Grade
  const gradeEl = $('scoreGrade');
  gradeEl.textContent = grade;
  gradeEl.style.color = score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';
}

/* ── SHOW / HIDE ──────────────────────────────────── */
function showResults() { $('resultsSection').style.display = 'block'; }
function hideResults()  { $('resultsSection').style.display = 'none'; }

function resetSearch() {
  hideResults();
  hideLoading();
  $('featuresStrip').style.display = '';
  $('searchInput').value = '';
  updateModeBadge('idle');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══════════════════════════════════════════════════
   ERROR DISPLAY
═══════════════════════════════════════════════════ */
function showError(msg) {
  // Simple toast-style error
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:#f25c54; color:#fff; padding:12px 24px;
    border-radius:99px; font-size:0.9rem; z-index:200;
    animation: fadeIn 0.3s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  `;
  toast.textContent = `❌ ${msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่'}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ═══════════════════════════════════════════════════
   PAYMENT MODAL
═══════════════════════════════════════════════════ */
function showPayment() {
  const modal = $('paymentModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  // Ensure step 1 is showing
  goToQR();
}

function closePayment() {
  const modal = $('paymentModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function closePaymentIfBackdrop(e) {
  if (e.target === $('paymentModal')) closePayment();
}

function goToQR() {
  $('payStep1').style.display = 'block';
  $('payStep2').style.display = 'none';
  $('payStep3').style.display = 'none';
  setModalStep(1);
}

function goToUpload() {
  $('payStep1').style.display = 'none';
  $('payStep2').style.display = 'block';
  $('payStep3').style.display = 'none';
  setModalStep(2);
}

function goToSuccess() {
  $('payStep1').style.display = 'none';
  $('payStep2').style.display = 'none';
  $('payStep3').style.display = 'block';
}

function setModalStep(n) {
  $('mStep1').className = 'modal-step' + (n >= 1 ? (n > 1 ? ' done' : ' active') : '');
  $('mStep2').className = 'modal-step' + (n >= 2 ? ' active' : '');
}

/* ── FILE UPLOAD ──────────────────────────────────── */
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function handleDragOver(e) {
  e.preventDefault();
  $('uploadArea').classList.add('drag-over');
}
function handleDragLeave() {
  $('uploadArea').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  $('uploadArea').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  state.uploadedFile = file;
  const area    = $('uploadArea');
  const preview = $('uploadPreview');
  const icon    = $('uploadIcon');
  const text    = $('uploadText');
  const hint    = area.querySelector('.upload-hint');

  area.classList.add('has-file');
  icon.textContent = '✅';
  text.textContent = 'ไฟล์พร้อมอัพโหลด';
  if (hint) hint.style.display = 'none';
  $('fileName').textContent = file.name;

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => {
      $('previewImg').src = e.target.result;
      preview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  } else {
    preview.style.display = 'flex';
    $('previewImg').style.display = 'none';
  }
}

/* ── SUBMIT SLIP ──────────────────────────────────── */
async function submitSlip() {
  const email = $('userEmail').value.trim();
  const file  = state.uploadedFile;

  if (!file) {
    showModalError('กรุณาอัพโหลดสลิปก่อน');
    return;
  }
  if (!email || !email.includes('@')) {
    showModalError('กรุณากรอกอีเมลให้ถูกต้อง');
    return;
  }

  const btn = $('submitSlipBtn');
  btn.disabled = true;
  $('submitBtnText').textContent = 'กำลังส่ง...';

  try {
    if (!CONFIG.USE_LOCAL_MOCK) {
      // Real submission to GAS
      const formData = new FormData();
      formData.append('action', 'submitSlip');
      formData.append('email', email);
      formData.append('query', state.query);
      formData.append('mode', state.mode);
      formData.append('slip', file);

      const res = await fetch(CONFIG.GAS_URL, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Submission failed');
    } else {
      // Mock: just wait
      await sleep(1500);
    }

    goToSuccess();
  } catch (err) {
    btn.disabled = false;
    $('submitBtnText').textContent = 'ส่งสลิปและรับรายงาน ✓';
    showModalError('เกิดข้อผิดพลาด กรุณาลองใหม่');
  }
}

function showModalError(msg) {
  // Find or create error in modal
  let err = $('modalError');
  if (!err) {
    err = document.createElement('p');
    err.id = 'modalError';
    err.style.cssText = 'color:var(--red);font-size:0.82rem;text-align:center;margin-top:8px;';
    $('payStep2').appendChild(err);
  }
  err.textContent = '⚠ ' + msg;
  setTimeout(() => { if (err) err.textContent = ''; }, 3000);
}

/* ═══════════════════════════════════════════════════
   KEYBOARD TRAP IN MODAL
═══════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('paymentModal').classList.contains('active')) {
    closePayment();
  }
});

/* ═══════════════════════════════════════════════════
   UTILITY
═══════════════════════════════════════════════════ */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ═══════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════ */
(function init() {
  // Focus search input on load
  setTimeout(() => $('searchInput').focus(), 300);

  // Animate hero in
  document.querySelectorAll('.hero > *').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    el.style.transitionDelay = `${i * 0.1}s`;
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 50);
  });
})();
