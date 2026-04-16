const CONFIG = {
  // ตรวจสอบว่า URL นี้ตรงกับที่ Deploy ล่าสุดหรือไม่
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzpqyJy75R8re8WXj5JJEh8wpuWaLnkg7zzzispt2Zf2nIRBlIUQajqR6_y2LIXX8dTtg/exec',
  USE_LOCAL_MOCK: false,
  FREE_ISSUE_COUNT: 2,
};

// ใช้ฟังก์ชันนี้แทนการ fetch ปกติเพื่อเลี่ยงปัญหา CORS กับ GAS
async function callGas(payload) {
  try {
    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      mode: 'no-cors', // ใช้ no-cors สำหรับ GAS ถ้าจำเป็น หรือดัก Error ให้ดี
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });
    
    // หมายเหตุ: ถ้าใช้ no-cors เราจะอ่าน body ไม่ได้ 
    // ดังนั้นแนะนำให้ใช้ mode 'cors' (ปกติ) แต่ต้องมั่นใจว่า GAS ไม่พัง
    
    const normalResponse = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await normalResponse.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

// แก้ไขฟังก์ชัน analyze ใน script.js เดิม
async function analyze() {
  const query = $('searchInput').value.trim();
  if (!query) return;

  state.query = query;
  showLoading(true);

  try {
    // ยิงไปที่ GAS
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      body: JSON.stringify({
        query: query,
        mode: state.mode
      })
    });
    
    const result = await res.json();
    
    if (result.success) {
      state.results = result.data;
      renderResults();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error(error);
    alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการตั้งค่า Deployment ของ Google Apps Script');
  } finally {
    showLoading(false);
  }
}