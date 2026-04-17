/* SEOไทย — script.js (v3) */

const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzfaSk88nDk5QfNVkMHtEQRR3CevTRVHFvOOEAuqbHhtGcD9SHbIjzcnK3uDzGmMlt8Rg/exec',
  USE_LOCAL_MOCK: false,
  FREE_ISSUE_COUNT: 2,
};

const state = { query: '', mode: 'keyword', results: null };

function $(id) { return document.getElementById(id); }

function detectMode(q) {
  return /^(https?:\/\/|www\.)[^\s]+/i.test(q.trim()) ? 'url' : 'keyword';
}

function updateModeBadge(q) {
  state.mode = detectMode(q);
  $('modeIcon').textContent  = state.mode === 'url' ? '\u{1F310}' : '\u{1F50D}';
  $('modeLabel').textContent = state.mode === 'url' ? 'URL Analysis'
                             : q ? 'Keyword Analysis' : '\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e23\u0e31\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25';
}

document.addEventListener('DOMContentLoaded', function() {
  var input = $('searchInput');
  input.addEventListener('input', function() { updateModeBadge(input.value); });
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleAnalyze(); });
});

function setExample(text) { $('searchInput').value = text; updateModeBadge(text); }

function showLoading(show) {
  $('loadingSection').style.display = show ? 'flex' : 'none';
  $('resultsSection').style.display = 'none';
  $('featuresStrip').style.display  = show ? 'none' : 'flex';
}

function resetSearch() {
  $('resultsSection').style.display = 'none';
  $('loadingSection').style.display = 'none';
  $('featuresStrip').style.display  = 'flex';
  $('searchInput').value = '';
  updateModeBadge('');
  state.results = null;
}

var _lt = null;
function animateLoadingSteps() {
  if (_lt) clearInterval(_lt);
  var i = 0;
  ['step1','step2','step3'].forEach(function(id) { $(id).className = 'step-item'; });
  $('step1').className = 'step-item active';
  _lt = setInterval(function() {
    i++;
    if (i < 3) {
      ['step1','step2','step3'].forEach(function(id, idx) {
        $(id).className = idx < i ? 'step-item done' : idx === i ? 'step-item active' : 'step-item';
      });
    } else { clearInterval(_lt); }
  }, 800);
}

async function handleAnalyze() {
  var query = $('searchInput').value.trim();
  if (!query) return;
  state.query = query;
  state.mode  = detectMode(query);
  showLoading(true);
  animateLoadingSteps();
  try {
    var result;
    if (CONFIG.USE_LOCAL_MOCK) {
      await new Promise(function(r) { setTimeout(r, 1500); });
      result = getMockData(query, state.mode);
    } else {
      var res  = await fetch(CONFIG.GAS_URL, { method: 'POST', body: JSON.stringify({ query: query, mode: state.mode }) });
      var json = await res.json();
      if (!json.success) throw new Error(json.error || 'Server error');
      result = json.data;
    }
    state.results = result;
    showLoading(false);
    renderResults(result);
  } catch(err) {
    console.error(err);
    showLoading(false);
    alert('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d\u0e44\u0e14\u0e49\n' + err.message);
  }
}

function renderResults(data) {
  $('resultsSection').style.display = 'block';
  $('featuresStrip').style.display  = 'none';
  $('resultsTypeBadge').textContent = data.mode === 'url' ? 'URL Analysis' : 'Keyword Analysis';
  $('resultsQuery').textContent     = data.query;
  animateScore(data.score);
  $('scoreGrade').textContent = data.grade;

  var statMap = data.mode === 'url'
    ? [ { label:'Load Speed', value:data.stats.loadSpeed, color:'green' }, { label:'Backlinks', value:data.stats.backlinks, color:'gold' } ]
    : [ { label:'Search Volume', value:data.stats.volume, color:'gold' }, { label:'Difficulty', value:data.stats.difficulty, color:'red' } ];
  $('scoreStats').innerHTML = statMap.map(function(s) {
    return '<div class="stat-item stat-'+s.color+'"><div class="stat-value">'+s.value+'</div><div class="stat-label">'+s.label+'</div></div>';
  }).join('');

  var issues = data.issues || [];
  var free   = issues.filter(function(i) { return i.type !== 'locked'; }).slice(0, CONFIG.FREE_ISSUE_COUNT);
  var locked = issues.filter(function(i) { return i.type === 'locked'; });

  $('issueCount').textContent = issues.length + ' \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23';
  $('freeIssues').innerHTML   = free.map(renderIssue).join('');
  if (locked.length > 0) {
    $('paywallZone').style.display = 'block';
    $('lockedCount').textContent   = locked.length;
    $('blurredIssues').innerHTML   = locked.map(renderIssue).join('');
  } else { $('paywallZone').style.display = 'none'; }
}

function renderIssue(issue) {
  var icons  = { critical:'\u{1F534}', warning:'\u{1F7E1}', locked:'\u{1F512}' };
  var labels = { critical:'CRITICAL', warning:'WARNING', locked:'LOCKED' };
  var sev    = issue.type === 'critical' ? 'high' : issue.type === 'warning' ? 'medium' : 'low';
  return '<div class="issue-item issue-'+sev+'"><div class="issue-icon">'+(icons[issue.type]||'\u26AA')+'</div>'
    +'<div class="issue-body"><div class="issue-title">'+issue.label+'</div><div class="issue-desc">'+issue.detail+'</div></div>'
    +'<div class="issue-badge badge-'+sev+'">'+(labels[issue.type]||issue.type.toUpperCase())+'</div></div>';
}

function animateScore(target) {
  var cur=0, el=$('scoreNumber'), arc=$('scoreArc'), circ=2*Math.PI*52;
  var t=setInterval(function(){
    cur=Math.min(cur+2,target);
    el.textContent=cur;
    arc.setAttribute('stroke-dasharray',((cur/100)*circ).toFixed(1)+' '+circ.toFixed(1));
    if(cur>=target) clearInterval(t);
  },16);
}

function getMockData(query, mode) {
  function h(s){var x=0;for(var i=0;i<s.length;i++){x=((x<<5)-x)+s.charCodeAt(i);x|=0;}return Math.abs(x)%50;}
  function g(sc){if(sc>=80)return'A';if(sc>=70)return'B';if(sc>=60)return'C';if(sc>=50)return'D';return'F';}
  var hv=h(query), sc=45+hv, url=mode==='url';
  return { score:sc, grade:g(sc), query:query, mode:mode,
    stats:{ volume:url?'-':(1200+hv*50).toLocaleString(), difficulty:url?'-':(20+(hv%60))+'/100',
            loadSpeed:url?(1.2+hv/50).toFixed(1)+'s':'-', backlinks:url?(hv*12).toLocaleString():'-' },
    issues:[
      {type:'critical',label:url?'Missing Meta Description':'High Competition',detail:'\u0e2a\u0e48\u0e07\u0e1c\u0e25\u0e01\u0e23\u0e30\u0e17\u0e1a\u0e15\u0e48\u0e2d\u0e2d\u0e31\u0e19\u0e14\u0e31\u0e1a\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e21\u0e32\u0e01'},
      {type:'warning', label:url?'Large Image Sizes':'Low Search Intent',     detail:'\u0e04\u0e27\u0e23\u0e1b\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e38\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e1b\u0e23\u0e30\u0e2a\u0e1a\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49'},
      {type:'locked',  label:'H1 Tag Optimization', detail:'\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e14\u0e39\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14'},
      {type:'locked',  label:'Schema Markup Check', detail:'\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e14\u0e39\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14'},
      {type:'locked',  label:'Backlink Opportunity',detail:'\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e14\u0e39\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14'}
    ]};
}

function showPayment(){$('paymentModal').style.display='flex';$('payStep1').style.display='block';$('payStep2').style.display='none';$('payStep3').style.display='none';$('mStep1').className='modal-step active';$('mStep2').className='modal-step';}
function closePayment(){$('paymentModal').style.display='none';}
function closePaymentIfBackdrop(e){if(e.target===$('paymentModal'))closePayment();}
function goToUpload(){$('payStep1').style.display='none';$('payStep2').style.display='block';$('mStep1').className='modal-step done';$('mStep2').className='modal-step active';}

var _sf=null;
function handleDragOver(e){e.preventDefault();$('uploadArea').classList.add('drag-over');}
function handleDragLeave(e){$('uploadArea').classList.remove('drag-over');}
function handleDrop(e){e.preventDefault();$('uploadArea').classList.remove('drag-over');if(e.dataTransfer.files[0])_setFile(e.dataTransfer.files[0]);}
function handleFileSelect(e){if(e.target.files[0])_setFile(e.target.files[0]);}
function _setFile(file){
  _sf=file;
  $('uploadText').textContent='\u0e44\u0e1f\u0e25\u0e4c\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01:';
  $('fileName').textContent=file.name;
  $('uploadPreview').style.display='block';
  if(file.type.startsWith('image/')){var r=new FileReader();r.onload=function(ev){$('previewImg').src=ev.target.result;};r.readAsDataURL(file);}
}

async function submitSlip(){
  var email=$('userEmail').value.trim();
  if(!email){alert('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e23\u0e2d\u0e01\u0e2d\u0e35\u0e40\u0e21\u0e25');return;}
  if(!_sf){alert('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e2d\u0e31\u0e1e\u0e42\u0e2b\u0e25\u0e14\u0e2a\u0e25\u0e34\u0e1b');return;}
  var btn=$('submitSlipBtn'),bt=$('submitBtnText');
  btn.disabled=true;bt.textContent='\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e48\u0e07...';
  try{
    var res=await fetch(CONFIG.GAS_URL,{method:'POST',body:JSON.stringify({action:'submitSlip',email:email,query:state.query,mode:state.mode,fileName:_sf.name})});
    var r=await res.json();
    if(r.success){$('payStep2').style.display='none';$('payStep3').style.display='block';$('mStep2').className='modal-step done';}
    else throw new Error(r.error||'Server error');
  }catch(err){
    console.error(err);alert('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e2a\u0e48\u0e07\u0e2a\u0e25\u0e34\u0e1b\u0e44\u0e14\u0e49\n'+err.message);
    btn.disabled=false;bt.textContent='\u0e2a\u0e48\u0e07\u0e2a\u0e25\u0e34\u0e1b\u0e41\u0e25\u0e30\u0e23\u0e31\u0e1a\u0e23\u0e32\u0e22\u0e07\u0e32\u0e19 \u2713';
  }
}
