// ===== GLP-1 用药助手 v1.4 - 主逻辑 =====

const STORAGE_KEY = 'glp1_assistant_data';

const DEFAULT_DATA = {
  reminder: null,
  injections: [],
  weights: [],
  sideEffects: [],
  height: null,
  waists: [],
  healthIndicators: []
};

// ===== Drug info library =====
const DRUG_INFO = {
  semaglutide_ozempic: { name: '司美格鲁肽', brand: 'Ozempic', generic: 'Semaglutide', type: '注射笔', freq: '每周一次', doseRange: '0.25-2.0 mg', desc: '诺和诺德生产，用于2型糖尿病血糖控制，兼具减重效果。起始剂量0.25mg，4周后增至0.5mg。' },
  semaglutide_wegovy: { name: '司美格鲁肽', brand: 'Wegovy', generic: 'Semaglutide', type: '注射笔', freq: '每周一次', doseRange: '0.25-2.4 mg', desc: '诺和诺德生产，专门获批用于体重管理（BMI≥30或BMI≥27伴合并症）。剂量逐步递增至2.4mg。' },
  liraglutide: { name: '利拉鲁肽', brand: 'Saxenda/Victoza', generic: 'Liraglutide', type: '注射笔', freq: '每天一次', doseRange: '0.6-3.0 mg', desc: '诺和诺德生产。Victoza用于糖尿病，Saxenda用于减重。需每天皮下注射，起始0.6mg逐步增至3.0mg。' },
  dulaglutide: { name: '度拉糖肽', brand: 'Trulicity', generic: 'Dulaglutide', type: '一次性自动注射笔', freq: '每周一次', doseRange: '0.75-4.5 mg', desc: '礼来公司生产。一次性预填充注射笔，操作简便。用于2型糖尿病，起始0.75mg。' },
  tirzepatide: { name: '替尔泊肽', brand: 'Mounjaro', generic: 'Tirzepatide', type: '注射笔', freq: '每周一次', doseRange: '2.5-15 mg', desc: '礼来公司生产，GIP/GLP-1双受体激动剂。减重效果显著，起始2.5mg逐步递增。' },
  semaglutide_oral: { name: '司美格鲁肽口服', brand: 'Rybelsus', generic: 'Oral Semaglutide', type: '口服片剂', freq: '每天一次', doseRange: '3-14 mg', desc: '诺和诺德生产，唯一的口服GLP-1制剂。需空腹服用，少量水送服，服药后至少等30分钟再进食。' },
  other: { name: '其他GLP-1药物', brand: '--', generic: '--', type: '--', freq: '--', doseRange: '--', desc: '请根据医生处方使用。GLP-1受体激动剂通过模拟肠促胰素来调节血糖和食欲。' }
};

const MISSED_DOSE_WINDOWS = {
  semaglutide_ozempic: 5 * 86400000,
  semaglutide_wegovy: 5 * 86400000,
  dulaglutide: 4 * 86400000,
  tirzepatide: 4 * 86400000,
  liraglutide: 24 * 3600000,
  semaglutide_oral: 24 * 3600000,
  other: 0
};

const SITE_NAMES = {
  'abdomen-ul': '腹部左上', 'abdomen-lm': '腹部左中', 'abdomen-ur': '腹部右上',
  'abdomen-rm': '腹部右中', 'abdomen-ll': '腹部左下', 'abdomen-lr': '腹部右下',
  'thigh-left': '左大腿', 'thigh-right': '右大腿', 'arm-left': '左上臂', 'arm-right': '右上臂'
};

const SYMPTOM_NAMES = {
  nausea: '🤢 恶心', vomiting: '🤮 呕吐', diarrhea: '💩 腹泻', constipation: '😣 便秘',
  headache: '🤕 头痛', fatigue: '😴 疲劳', dizziness: '😵 头晕',
  appetite_loss: '🍽️ 食欲减退', injection_reaction: '🔴 注射反应'
};

const SEVERITY_LABELS = { mild: '轻度', moderate: '中度', severe: '重度' };

const FATTY_LIVER_LABELS = {
  none: '无脂肪肝', mild: '轻度脂肪肝', moderate: '中度脂肪肝', severe: '重度脂肪肝'
};

// ===== Data helpers =====
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Deep merge with defaults for new fields
    return {
      ...DEFAULT_DATA,
      ...parsed,
      waists: parsed.waists || [],
      healthIndicators: parsed.healthIndicators || [],
      height: parsed.height || null
    };
  } catch { return { ...DEFAULT_DATA }; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== Toast =====
function showToast(msg, ms = 2000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), ms);
}

// ===== Confirm dialog =====
function showConfirm(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `<div class="dialog-box">
      <p>${msg}</p>
      <div class="dialog-btns">
        <button class="btn btn-danger" id="dialogCancel">取消</button>
        <button class="btn btn-primary" id="dialogOk">确认</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#dialogCancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#dialogOk').onclick = () => { overlay.remove(); resolve(true); };
  });
}

// ===== Format helpers =====
function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDateShort(iso) {
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()}`;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ===== BMI calculation =====
function calcBMI(weightKg, heightCm) {
  if (!heightCm || heightCm <= 0) return null;
  const h = heightCm / 100;
  return weightKg / (h * h);
}

function getBMILevel(bmi) {
  if (bmi === null) return { level: '', color: '', label: '' };
  if (bmi < 18.5) return { level: 'underweight', color: '#3498DB', label: '偏瘦' };
  if (bmi < 24) return { level: 'normal', color: '#4CAF80', label: '正常' };
  if (bmi < 28) return { level: 'overweight', color: '#F39C12', label: '超重' };
  return { level: 'obese', color: '#E74C3C', label: '肥胖' };
}

// ===== Navigation =====
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'home') refreshHome();
    if (tab === 'health') refreshHealthTab();
    if (tab === 'inject') refreshInjectTab();
    if (tab === 'sidefx') refreshSidefxTab();
    if (tab === 'drugs') refreshDrugsTab();
  });
});

// Health sub-navigation
document.querySelectorAll('.sub-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sub = btn.dataset.sub;
    document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`sub-${sub}`).classList.add('active');
    const data = loadData();
    if (sub === 'weight') drawWeightChart(data.weights);
    if (sub === 'waist') drawWaistChart(data.waists);
  });
});

// ===== Delete helpers =====
async function deleteInjectionByIdx(idx) {
  const d = loadData();
  if (idx < 0 || idx >= d.injections.length) return;
  const inj = d.injections[idx];
  const ok = await showConfirm(`确定删除 ${inj.date} 的注射记录吗？\n${inj.drugName || inj.drug} · ${inj.dose}mg · ${inj.siteName || inj.site}`);
  if (!ok) return;
  d.injections.splice(idx, 1);
  saveData(d);
  refreshHome();
  refreshInjectTab();
  showToast('🗑️ 注射记录已删除');
}

// ===== Home Tab =====
function localDateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNextInjection(data, now = new Date()) {
  if (!data.reminder) return null;
  const { frequency, weekday, time = '08:00', drug } = data.reminder;
  const [h, m] = time.split(':').map(Number);
  const periodMs = frequency === 'daily' ? 86400000
    : frequency === 'weekly' ? 7 * 86400000
    : frequency === 'biweekly' ? 14 * 86400000 : 0;
  if (!periodMs) return null;
  let scheduled = new Date(now);
  scheduled.setHours(h, m, 0, 0);
  if (frequency !== 'daily') {
    const targetDay = Number.parseInt(weekday, 10);
    if (!Number.isInteger(targetDay) || targetDay < 0 || targetDay > 6) return null;
    scheduled.setDate(scheduled.getDate() - ((scheduled.getDay() - targetDay + 7) % 7));
    if (frequency === 'biweekly' && data.reminder.scheduleAnchor) {
      const anchor = new Date(data.reminder.scheduleAnchor);
      if (!Number.isNaN(anchor.getTime())) {
        anchor.setHours(h, m, 0, 0);
        const periods = Math.floor((scheduled - anchor) / periodMs);
        scheduled = new Date(anchor.getTime() + periods * periodMs);
      }
    }
  }
  if (scheduled > now) return scheduled;
  const allowedWindow = MISSED_DOSE_WINDOWS[drug] ?? Math.max(0, periodMs - 1);
  const deadline = new Date(scheduled.getTime() + Math.min(allowedWindow, periodMs));
  const startKey = localDateKey(scheduled);
  const deadlineKey = localDateKey(deadline);
  const completed = (data.injections || []).some(injection => {
    if (drug && injection.drug && injection.drug !== drug) return false;
    const key = localDateKey(injection.date);
    return key && key >= startKey && key <= deadlineKey;
  });
  if (!completed && now <= deadline) return scheduled;
  let next = new Date(scheduled.getTime() + periodMs);
  while (next <= now) next = new Date(next.getTime() + periodMs);
  return next;
}

function refreshHome() {
  const data = loadData();
  const next = getNextInjection(data);

  // Countdown
  if (next) {
    const now = new Date();
    const diff = next - now;
    if (diff <= 0) {
      document.getElementById('countdownTime').textContent = '现在该注射了！';
      document.getElementById('countdownInfo').textContent = '';
    } else {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      let display = days > 0 ? `${days}天 ${hours}小时` : hours > 0 ? `${hours}小时 ${mins}分钟` : `${mins}分钟`;
      document.getElementById('countdownTime').textContent = display;
      const infoParts = [];
      const drugName = data.reminder.drugName || (data.reminder.drug ? DRUG_INFO[data.reminder.drug]?.brand : '');
      if (drugName) infoParts.push(`💊 ${drugName}`);
      if (data.reminder.dose) infoParts.push(`📏 ${data.reminder.dose} mg`);
      infoParts.push(`📅 ${fmtDate(next.toISOString())} ${data.reminder.time}`);
      document.getElementById('countdownInfo').textContent = infoParts.join('  ');
    }
  } else {
    document.getElementById('countdownTime').textContent = '未设置用药计划';
    document.getElementById('countdownInfo').textContent = '去"注射"页设置提醒吧';
  }

  // Stats
  document.getElementById('statTotal').textContent = data.injections.length;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = data.injections.filter(i => new Date(i.date) >= weekStart).length;
  document.getElementById('statThisWeek').textContent = thisWeek;

  if (data.weights.length > 0) {
    document.getElementById('statWeight').textContent = `${data.weights[data.weights.length - 1].weight} kg`;
  } else {
    document.getElementById('statWeight').textContent = '--';
  }

  if (data.waists.length > 0) {
    document.getElementById('statWaist').textContent = `${data.waists[data.waists.length - 1].waist} cm`;
  } else {
    document.getElementById('statWaist').textContent = '--';
  }

  if (data.height && data.weights.length > 0) {
    const bmi = calcBMI(data.weights[data.weights.length - 1].weight, data.height);
    if (bmi) document.getElementById('statBMI').textContent = bmi.toFixed(1);
    else document.getElementById('statBMI').textContent = '--';
  } else {
    document.getElementById('statBMI').textContent = '--';
  }

  // Site suggestion
  const siteSuggestion = document.getElementById('siteSuggestion');
  if (data.injections.length > 0) {
    const lastSite = data.injections[data.injections.length - 1].site;
    const allSites = ['abdomen-ul', 'abdomen-lm', 'abdomen-ur', 'abdomen-rm', 'abdomen-ll', 'abdomen-lr', 'thigh-left', 'thigh-right', 'arm-left', 'arm-right'];
    const lastIdx = allSites.indexOf(lastSite);
    const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % allSites.length : 0;
    siteSuggestion.innerHTML = `
      <div class="site-icon">💉</div>
      <div class="site-text">
        上次：<strong>${SITE_NAMES[lastSite] || lastSite}</strong><br>
        建议：<strong>${SITE_NAMES[allSites[nextIdx]]}</strong>
        <span style="font-size:12px;color:var(--text-secondary)">（轮换原则）</span>
      </div>`;
  } else {
    siteSuggestion.innerHTML = `<div class="site-icon">🔄</div><div class="site-text">请先记录一次注射</div>`;
  }

  // Recent injections
  const recent = [...data.injections].reverse().slice(0, 5);
  const recentList = document.getElementById('recentList');
  if (recent.length === 0) {
    recentList.innerHTML = '<div class="empty-state">暂无注射记录</div>';
  } else {
    recentList.innerHTML = recent.map(i => {
      const origIdx = data.injections.indexOf(i);
      return `
      <div class="history-item">
        <div class="hi-left">
          <span class="hi-date">${fmtDate(i.date)}</span>
          <span class="hi-detail">${i.drugName || DRUG_INFO[i.drug]?.brand || i.drug} · ${i.siteName || SITE_NAMES[i.site] || i.site}</span>
        </div>
        <div class="hi-right" style="display:flex;align-items:center;gap:6px;">
          <span class="hi-dose">${i.dose} mg</span>
          <button class="btn-del-inj" data-idx="${origIdx}" style="background:none;border:none;color:#E74C3C;font-size:14px;cursor:pointer;padding:0 2px;">✕</button>
        </div>
      </div>`}).join('');
    recentList.querySelectorAll('.btn-del-inj').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteInjectionByIdx(parseInt(btn.dataset.idx));
      });
    });
  }
}

// ===== Inject Tab =====
function refreshInjectTab() {
  const data = loadData();

  if (data.reminder) {
    document.getElementById('freqSelect').value = data.reminder.frequency || 'weekly';
    if (data.reminder.weekday !== undefined) document.getElementById('weekdaySelect').value = data.reminder.weekday;
    document.getElementById('reminderTime').value = data.reminder.time || '08:00';
    document.getElementById('drugSelect').value = data.reminder.drug || 'semaglutide_ozempic';
    document.getElementById('doseInput').value = data.reminder.dose || '';
  }
  toggleWeekdayGroup();

  document.getElementById('manualDate').value = todayISO();
  document.getElementById('manualSite').value = '';
  // Sync drug & dose from reminder settings
  if (data.reminder) {
    document.getElementById('manualDrug').value = data.reminder.drug;
    document.getElementById('manualDose').value = String(data.reminder.dose);
  }

  // Injection history
  const history = [...data.injections].reverse();
  const historyEl = document.getElementById('injectHistory');
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="empty-state">暂无记录</div>';
  } else {
    historyEl.innerHTML = history.map(i => {
      const origIdx = data.injections.indexOf(i);
      return `
      <div class="history-item">
        <div class="hi-left">
          <span class="hi-date">${fmtDate(i.date)}</span>
          <span class="hi-detail">${i.drugName || DRUG_INFO[i.drug]?.brand || i.drug} · ${i.siteName || SITE_NAMES[i.site] || i.site}</span>
        </div>
        <div class="hi-right" style="display:flex;align-items:center;gap:6px;">
          <div style="text-align:right;">
            <span class="hi-dose">${i.dose} mg</span>
            ${i.note ? `<div class="hi-site">${i.note}</div>` : ''}
          </div>
          <button class="btn-del-inj" data-idx="${origIdx}" style="background:none;border:none;color:#E74C3C;font-size:14px;cursor:pointer;padding:0 2px;">✕</button>
        </div>
      </div>`}).join('');
    historyEl.querySelectorAll('.btn-del-inj').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteInjectionByIdx(parseInt(btn.dataset.idx));
      });
    });
  }
  updateSiteMap(data);
}

function toggleWeekdayGroup() {
  const freq = document.getElementById('freqSelect').value;
  document.getElementById('weekdayGroup').style.display = (freq === 'daily') ? 'none' : 'block';
}

function updateSiteMap(data) {
  const lastInj = data.injections[data.injections.length - 1];
  document.querySelectorAll('.site-zone').forEach(zone => {
    zone.classList.remove('selected', 'last-used');
    if (lastInj && zone.dataset.zone === lastInj.site) zone.classList.add('last-used');
  });
}

// ===== iOS/Android App Detection =====
const isIOSApp = () => !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.notification);
const isAndroidApp = () => !!(window.Android && window.Android.postMessage);
const isNativeApp = () => isIOSApp() || isAndroidApp();

function iosBridgeRequestPermission() {
  try {
    window.webkit.messageHandlers.notification.postMessage(JSON.stringify({ action: 'requestPermission' }));
  } catch(e) { console.warn('iOS bridge requestPermission failed:', e); }
}

function iosBridgeSchedule(title, body, delaySeconds) {
  try {
    window.webkit.messageHandlers.notification.postMessage(JSON.stringify({
      action: 'schedule', title, body, delaySeconds: delaySeconds || 1
    }));
  } catch(e) { console.warn('iOS bridge schedule failed:', e); }
}

function nativeRequestPermission() {
  try {
    if (isIOSApp()) {
      iosBridgeRequestPermission();
    } else if (isAndroidApp()) {
      window.Android.postMessage(JSON.stringify({ action: 'requestPermission' }));
    }
  } catch(e) { console.warn('Native requestPermission failed:', e); }
}

function nativeSchedule(title, body, delaySeconds) {
  try {
    const msg = JSON.stringify({ action: 'schedule', title, body, delaySeconds: delaySeconds || 1 });
    if (isIOSApp()) {
      window.webkit.messageHandlers.notification.postMessage(msg);
    } else if (isAndroidApp()) {
      window.Android.postMessage(msg);
    }
  } catch(e) { console.warn('Native schedule failed:', e); }
}

// ===== Notification =====
function updateNotifyStatus() {
  const el = document.getElementById('notifyStatus');
  // Native app: always show enabled - native manages permissions
  if (isNativeApp()) {
    el.innerHTML = '✅ 通知已开启 · 将在注射日前提醒';
    return;
  }
  if (!('Notification' in window)) {
    el.innerHTML = '⚠️ 此浏览器不支持通知';
    return;
  }
  if (Notification.permission === 'granted') {
    el.innerHTML = '✅ 通知已开启 · 将在注射日前提醒';
  } else if (Notification.permission === 'denied') {
    el.innerHTML = '🚫 通知已被拒绝 · 请在系统设置中开启';
  } else {
    el.innerHTML = '<button class="btn btn-sm btn-primary" id="btnRequestNotify">🔔 开启用药提醒通知</button>';
    setTimeout(() => {
      const btn = document.getElementById('btnRequestNotify');
      if (btn) btn.addEventListener('click', requestNotification);
    }, 100);
  }
}

async function requestNotification() {
  try {
    if (isNativeApp()) {
      nativeRequestPermission();
      showToast('✅ 通知已开启');
      return;
    }
    const perm = await Notification.requestPermission();
    updateNotifyStatus();
    if (perm === 'granted') showToast('✅ 通知已开启');
  } catch { showToast('⚠️ 通知请求失败'); }
}

function checkAndNotify() {
  const data = loadData();
  const next = getNextInjection(data);
  if (!next) return;
  const now = new Date();
  const diff = next - now;
  if (!(diff > 0 && diff <= 30 * 60 * 1000)) return;

  const lastNotified = sessionStorage.getItem('glp1_last_notify');
  const nextKey = next.toISOString().slice(0, 16);
  if (lastNotified === nextKey) return;
  sessionStorage.setItem('glp1_last_notify', nextKey);

  const drugName = data.reminder?.drugName || '';
  const dose = data.reminder?.dose || '';
  const title = '💉 GLP-1 用药提醒';
  const body = `该注射 ${drugName} 了！剂量：${dose}mg`;

  // Native app: use native bridge for reliable notifications (iOS + Android)
  if (isNativeApp()) {
    nativeSchedule(title, body, 1);
    return;
  }

  // Browser: use Web Notification API
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, {
    body: body,
    icon: 'icons/icon-192.png',
    tag: 'glp1-injection',
    requireInteraction: true
  });
}

// ===== Health Tab =====
function refreshHealthTab() {
  const data = loadData();

  // Height
  if (data.height) document.getElementById('heightInput').value = data.height;
  else document.getElementById('heightInput').value = '';

  // BMI display
  updateBMIDisplay(data);

  // Weight
  document.getElementById('weightDate').value = todayISO();
  document.getElementById('weightInput').value = '';
  refreshWeightHistory(data);
  drawWeightChart(data.weights);

  // Waist
  document.getElementById('waistDate').value = todayISO();
  document.getElementById('waistInput').value = '';
  refreshWaistHistory(data);
  drawWaistChart(data.waists);

  // Indicators
  document.getElementById('indDate').value = todayISO();
  document.getElementById('indTC').value = '';
  document.getElementById('indTG').value = '';
  document.getElementById('indHDL').value = '';
  document.getElementById('indLDL').value = '';
  document.getElementById('indFattyLiver').value = '';
  refreshIndHistory(data);
}

function updateBMIDisplay(data) {
  const el = document.getElementById('bmiDisplay');
  if (!data.height) {
    el.innerHTML = '<div class="bmi-value">--</div><div class="bmi-label">请先设置身高</div><div class="bmi-level"></div>';
    return;
  }
  if (data.weights.length === 0) {
    el.innerHTML = '<div class="bmi-value">--</div><div class="bmi-label">暂无体重数据</div><div class="bmi-level"></div>';
    return;
  }
  const weight = data.weights[data.weights.length - 1].weight;
  const bmi = calcBMI(weight, data.height);
  if (bmi === null) {
    el.innerHTML = '<div class="bmi-value">--</div><div class="bmi-label">BMI</div><div class="bmi-level"></div>';
    return;
  }
  const level = getBMILevel(bmi);
  el.innerHTML = `
    <div class="bmi-value" style="color:${level.color}">${bmi.toFixed(1)}</div>
    <div class="bmi-label">BMI · 身高 ${data.height} cm</div>
    <div class="bmi-level" style="color:${level.color};font-weight:600;">${level.label}</div>`;
}

function refreshWeightHistory(data) {
  const weights = data.weights;
  const summary = document.getElementById('weightSummary');
  if (weights.length === 0) {
    summary.innerHTML = `<div class="ws-item"><span>起始体重</span><strong>-- kg</strong></div>
      <div class="ws-item"><span>当前体重</span><strong>-- kg</strong></div>
      <div class="ws-item"><span>已减</span><strong>-- kg</strong></div>`;
  } else {
    const start = weights[0].weight;
    const current = weights[weights.length - 1].weight;
    const lost = (start - current).toFixed(1);
    summary.innerHTML = `<div class="ws-item"><span>起始体重</span><strong>${start} kg</strong></div>
      <div class="ws-item"><span>当前体重</span><strong>${current} kg</strong></div>
      <div class="ws-item"><span>已减</span><strong>${lost} kg</strong></div>`;
  }

  const history = [...weights].reverse();
  const historyEl = document.getElementById('weightHistory');
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="empty-state">暂无记录</div>';
  } else {
    historyEl.innerHTML = history.map(w => `
      <div class="history-item">
        <div class="hi-left"><span class="hi-date">${fmtDate(w.date)}</span></div>
        <div class="hi-right" style="display:flex;align-items:center;gap:8px;">
          <span class="hi-dose">${w.weight} kg</span>
          <button class="btn-del-weight" data-date="${w.date}" data-weight="${w.weight}" style="background:none;border:none;color:#E74C3C;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
        </div>
      </div>`).join('');
    historyEl.querySelectorAll('.btn-del-weight').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const date = btn.dataset.date;
        const weight = parseFloat(btn.dataset.weight);
        const ok = await showConfirm(`确定删除 ${date} 的体重记录（${weight} kg）吗？`);
        if (!ok) return;
        const d = loadData();
        d.weights = d.weights.filter(w => !(w.date === date && w.weight === weight));
        saveData(d);
        refreshHealthTab();
        refreshHome();
        showToast('🗑️ 体重记录已删除');
      });
    });
  }
}

function refreshWaistHistory(data) {
  const waists = data.waists;
  const summary = document.getElementById('waistSummary');
  if (waists.length === 0) {
    summary.innerHTML = `<div class="ws-item"><span>起始腰围</span><strong>-- cm</strong></div>
      <div class="ws-item"><span>当前腰围</span><strong>-- cm</strong></div>
      <div class="ws-item"><span>已减</span><strong>-- cm</strong></div>`;
  } else {
    const start = waists[0].waist;
    const current = waists[waists.length - 1].waist;
    const lost = (start - current).toFixed(1);
    summary.innerHTML = `<div class="ws-item"><span>起始腰围</span><strong>${start} cm</strong></div>
      <div class="ws-item"><span>当前腰围</span><strong>${current} cm</strong></div>
      <div class="ws-item"><span>已减</span><strong>${lost} cm</strong></div>`;
  }

  const history = [...waists].reverse();
  const historyEl = document.getElementById('waistHistory');
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="empty-state">暂无记录</div>';
  } else {
    historyEl.innerHTML = history.map(w => `
      <div class="history-item">
        <div class="hi-left"><span class="hi-date">${fmtDate(w.date)}</span></div>
        <div class="hi-right" style="display:flex;align-items:center;gap:8px;">
          <span class="hi-dose">${w.waist} cm</span>
          <button class="btn-del-waist" data-date="${w.date}" data-waist="${w.waist}" style="background:none;border:none;color:#E74C3C;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
        </div>
      </div>`).join('');
    historyEl.querySelectorAll('.btn-del-waist').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const date = btn.dataset.date;
        const waist = parseFloat(btn.dataset.waist);
        const ok = await showConfirm(`确定删除 ${date} 的腰围记录（${waist} cm）吗？`);
        if (!ok) return;
        const d = loadData();
        d.waists = d.waists.filter(w => !(w.date === date && w.waist === waist));
        saveData(d);
        refreshHealthTab();
        refreshHome();
        showToast('🗑️ 腰围记录已删除');
      });
    });
  }
}

function refreshIndHistory(data) {
  const history = [...data.healthIndicators].reverse();
  const historyEl = document.getElementById('indHistory');
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="empty-state">暂无记录</div>';
  } else {
    historyEl.innerHTML = history.map((h, i) => `
      <div class="ind-item">
        <div class="ind-header">
          <span class="ind-date">${fmtDate(h.date)}</span>
          <button class="btn-del-ind" style="background:none;border:none;color:#E74C3C;font-size:14px;cursor:pointer;padding:0 2px;">✕</button>
        </div>
        <div class="ind-grid">
          ${h.tc !== null && h.tc !== undefined ? `<div class="ind-cell"><span>TC</span><strong>${h.tc}</strong></div>` : ''}
          ${h.tg !== null && h.tg !== undefined ? `<div class="ind-cell"><span>TG</span><strong>${h.tg}</strong></div>` : ''}
          ${h.hdl !== null && h.hdl !== undefined ? `<div class="ind-cell"><span>HDL</span><strong>${h.hdl}</strong></div>` : ''}
          ${h.ldl !== null && h.ldl !== undefined ? `<div class="ind-cell"><span>LDL</span><strong>${h.ldl}</strong></div>` : ''}
          ${h.fattyLiver ? `<div class="ind-cell"><span>脂肪肝</span><strong>${FATTY_LIVER_LABELS[h.fattyLiver]}</strong></div>` : ''}
        </div>
      </div>`).join('');
    historyEl.querySelectorAll('.btn-del-ind').forEach((btn, i) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const h = history[i];
        const ok = await showConfirm(`确定删除 ${fmtDate(h.date)} 的健康指标记录吗？`);
        if (!ok) return;
        const d = loadData();
        d.healthIndicators = d.healthIndicators.filter(x => !(x.date === h.date && JSON.stringify(x) === JSON.stringify(h)));
        saveData(d);
        refreshHealthTab();
        showToast('🗑️ 指标记录已删除');
      });
    });
  }
}

// ===== Chart drawing =====
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawChart(canvasId, data, valueKey, color, unit) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  canvas.width = container.offsetWidth * (window.devicePixelRatio || 1);
  canvas.height = container.offsetHeight * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  const w = container.offsetWidth;
  const h = container.offsetHeight;
  ctx.clearRect(0, 0, w, h);

  if (data.length < 2) {
    ctx.fillStyle = '#7F8C8D';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('至少需要2条记录才能显示图表', w / 2, h / 2);
    return;
  }

  const pad = { top: 20, right: 16, bottom: 30, left: 40 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const values = data.map(d => d[valueKey]);
  const minVal = Math.floor(Math.min(...values) - 2);
  const maxVal = Math.ceil(Math.max(...values) + 2);
  const range = maxVal - minVal || 1;

  const toX = i => pad.left + (i / (data.length - 1)) * plotW;
  const toY = v => pad.top + plotH - ((v - minVal) / range) * plotH;

  // Grid
  ctx.strokeStyle = '#E8ECF1';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    const val = maxVal - (range * i) / 4;
    ctx.fillStyle = '#7F8C8D';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(1), pad.left - 6, y + 3);
  }

  // Line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = toX(i), y = toY(d[valueKey]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Gradient fill
  const lastX = toX(data.length - 1);
  ctx.lineTo(lastX, pad.top + plotH);
  ctx.lineTo(toX(0), pad.top + plotH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  grad.addColorStop(0, hexToRgba(color, 0.25));
  grad.addColorStop(1, hexToRgba(color, 0.03));
  ctx.fillStyle = grad;
  ctx.fill();

  // Dots
  data.forEach((d, i) => {
    const x = toX(i), y = toY(d[valueKey]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Date labels
  ctx.fillStyle = '#7F8C8D';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(data.length / 5));
  for (let i = 0; i < data.length; i += step) {
    ctx.fillText(fmtDateShort(data[i].date), toX(i), h - 6);
  }
  if (data.length > 1 && (data.length - 1) % step !== 0) {
    ctx.fillText(fmtDateShort(data[data.length - 1].date), toX(data.length - 1), h - 6);
  }
}

function drawWeightChart(weights) {
  drawChart('weightCanvas', weights, 'weight', '#4CAF80', 'kg');
}
function drawWaistChart(waists) {
  drawChart('waistCanvas', waists, 'waist', '#9B59B6', 'cm');
}

// ===== Event: Height =====
document.getElementById('btnSaveHeight').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('heightInput').value);
  if (!val || val < 50 || val > 300) { showToast('⚠️ 请输入有效身高 (50-300 cm)'); return; }
  const data = loadData();
  data.height = val;
  saveData(data);
  updateBMIDisplay(data);
  refreshHome();
  showToast('✅ 身高已保存');
});

// ===== Event: Weight =====
document.getElementById('btnWeightRecord').addEventListener('click', () => {
  const date = document.getElementById('weightDate').value;
  const weight = parseFloat(document.getElementById('weightInput').value);
  if (!weight || weight <= 0) { showToast('⚠️ 请输入有效体重'); return; }
  const data = loadData();
  data.weights.push({ date, weight });
  data.weights.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  saveData(data);
  document.getElementById('weightInput').value = '';
  updateBMIDisplay(data);
  refreshWeightHistory(data);
  drawWeightChart(data.weights);
  refreshHome();
  showToast('✅ 体重已记录');
});

// ===== Event: Waist =====
document.getElementById('btnWaistRecord').addEventListener('click', () => {
  const date = document.getElementById('waistDate').value;
  const waist = parseFloat(document.getElementById('waistInput').value);
  if (!waist || waist < 20 || waist > 300) { showToast('⚠️ 请输入有效腰围 (20-300 cm)'); return; }
  const data = loadData();
  data.waists.push({ date, waist });
  data.waists.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  saveData(data);
  document.getElementById('waistInput').value = '';
  refreshWaistHistory(data);
  drawWaistChart(data.waists);
  refreshHome();
  showToast('✅ 腰围已记录');
});

// ===== Event: Health Indicators =====
document.getElementById('btnIndRecord').addEventListener('click', () => {
  const date = document.getElementById('indDate').value;
  const tc = document.getElementById('indTC').value ? parseFloat(document.getElementById('indTC').value) : null;
  const tg = document.getElementById('indTG').value ? parseFloat(document.getElementById('indTG').value) : null;
  const hdl = document.getElementById('indHDL').value ? parseFloat(document.getElementById('indHDL').value) : null;
  const ldl = document.getElementById('indLDL').value ? parseFloat(document.getElementById('indLDL').value) : null;
  const fattyLiver = document.getElementById('indFattyLiver').value || null;

  if (tc === null && tg === null && hdl === null && ldl === null && !fattyLiver) {
    showToast('⚠️ 请至少填写一项指标'); return;
  }

  const data = loadData();
  data.healthIndicators.push({ date, tc, tg, hdl, ldl, fattyLiver });
  data.healthIndicators.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  saveData(data);
  document.getElementById('indTC').value = '';
  document.getElementById('indTG').value = '';
  document.getElementById('indHDL').value = '';
  document.getElementById('indLDL').value = '';
  document.getElementById('indFattyLiver').value = '';
  refreshIndHistory(data);
  showToast('✅ 健康指标已记录');
});

// ===== Event: Reminder =====
let selectedSite = null;
let selectedSymptoms = new Set();
let selectedSeverity = null;

document.getElementById('freqSelect').addEventListener('change', toggleWeekdayGroup);

document.querySelectorAll('.site-zone').forEach(zone => {
  zone.addEventListener('click', () => {
    document.querySelectorAll('.site-zone').forEach(z => z.classList.remove('selected'));
    zone.classList.add('selected');
    selectedSite = zone.dataset.zone;
    document.getElementById('manualSite').value = selectedSite;
  });
});

document.getElementById('btnSaveReminder').addEventListener('click', () => {
  const data = loadData();
  const drug = document.getElementById('drugSelect').value;
  data.reminder = {
    frequency: document.getElementById('freqSelect').value,
    weekday: document.getElementById('weekdaySelect').value,
    time: document.getElementById('reminderTime').value,
    drug: drug,
    drugName: DRUG_INFO[drug]?.brand || drug,
    dose: parseFloat(document.getElementById('doseInput').value) || 0,
    scheduleAnchor: new Date().toISOString()
  };
  saveData(data);
  showToast('✅ 用药计划已保存');
  refreshHome();
});

document.getElementById('btnManualRecord').addEventListener('click', () => {
  const data = loadData();
  const drug = document.getElementById('manualDrug').value;
  const site = document.getElementById('manualSite').value;
  if (!site) { showToast('⚠️ 请选择注射部位'); return; }
  data.injections.push({
    date: document.getElementById('manualDate').value,
    drug: drug,
    drugName: DRUG_INFO[drug]?.brand || drug,
    dose: parseFloat(document.getElementById('manualDose').value) || 0,
    site: site,
    siteName: SITE_NAMES[site] || site,
    note: document.getElementById('manualNote').value.trim()
  });
  data.injections.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  saveData(data);
  selectedSite = null;
  document.querySelectorAll('.site-zone').forEach(z => z.classList.remove('selected'));
  document.getElementById('manualSite').value = '';
  document.getElementById('manualNote').value = '';
  document.getElementById('manualDate').value = todayISO();
  showToast('✅ 注射记录已保存');
  refreshInjectTab();
  refreshHome();
});

document.getElementById('btnRecordNow').addEventListener('click', () => {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="inject"]').classList.add('active');
  document.getElementById('tab-inject').classList.add('active');
  document.getElementById('manualDate').value = todayISO();
  refreshInjectTab();
  window.scrollTo(0, document.getElementById('manualDate').offsetTop - 80);
});

document.getElementById('btnClearHistory').addEventListener('click', async () => {
  const ok = await showConfirm('确定要清空所有注射历史吗？此操作不可恢复。');
  if (!ok) return;
  const data = loadData();
  data.injections = [];
  saveData(data);
  refreshInjectTab();
  refreshHome();
  showToast('🗑️ 注射历史已清空');
});

// ===== Side Effects =====
document.querySelectorAll('#symptomChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const symptom = chip.dataset.symptom;
    if (selectedSymptoms.has(symptom)) {
      selectedSymptoms.delete(symptom);
      chip.classList.remove('selected');
    } else {
      selectedSymptoms.add(symptom);
      chip.classList.add('selected');
    }
  });
});

document.querySelectorAll('#severityGroup .severity-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#severityGroup .severity-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedSeverity = btn.dataset.severity;
  });
});

function refreshSidefxTab() {
  const data = loadData();
  document.getElementById('sidefxDate').value = todayISO();
  document.getElementById('sidefxNote').value = '';
  selectedSymptoms = new Set();
  selectedSeverity = null;
  document.querySelectorAll('#symptomChips .chip').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#severityGroup .severity-btn').forEach(b => b.classList.remove('selected'));

  const history = [...data.sideEffects].reverse();
  const historyEl = document.getElementById('sidefxHistory');
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="empty-state">暂无记录</div>';
  } else {
    historyEl.innerHTML = history.map(s => `
      <div class="sfx-item">
        <div class="sfx-header">
          <span class="sfx-date">${fmtDate(s.date)}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="sfx-severity ${s.severity}">${SEVERITY_LABELS[s.severity]}</span>
            <button class="btn-del-sfx" style="background:none;border:none;color:#E74C3C;font-size:14px;cursor:pointer;padding:0 2px;">✕</button>
          </div>
        </div>
        <div class="sfx-symptoms">${s.symptoms.map(sy => SYMPTOM_NAMES[sy] || sy).join(' ')}</div>
        ${s.note ? `<div class="sfx-note">${s.note}</div>` : ''}
      </div>`).join('');
    historyEl.querySelectorAll('.btn-del-sfx').forEach((btn, i) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const s = history[i];
        const ok = await showConfirm(`确定删除 ${fmtDate(s.date)} 的副作用记录吗？`);
        if (!ok) return;
        const d = loadData();
        d.sideEffects = d.sideEffects.filter(sf =>
          !(sf.date === s.date && sf.symptoms.join(',') === s.symptoms.join(',')));
        saveData(d);
        refreshSidefxTab();
        showToast('🗑️ 副作用记录已删除');
      });
    });
  }
}

document.getElementById('btnSidefxRecord').addEventListener('click', () => {
  if (selectedSymptoms.size === 0) { showToast('⚠️ 请选择至少一个症状'); return; }
  if (!selectedSeverity) { showToast('⚠️ 请选择严重程度'); return; }
  const data = loadData();
  data.sideEffects.push({
    date: document.getElementById('sidefxDate').value,
    symptoms: [...selectedSymptoms],
    severity: selectedSeverity,
    note: document.getElementById('sidefxNote').value.trim()
  });
  data.sideEffects.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  saveData(data);
  refreshSidefxTab();
  showToast('✅ 副作用已记录');
});

// ===== Drugs Tab =====
function refreshDrugsTab() {
  const cards = Object.entries(DRUG_INFO).map(([key, info]) => `
    <div class="drug-card">
      <div class="drug-name">${info.name}</div>
      <div class="drug-generic">${info.brand} · ${info.generic}</div>
      <div class="drug-info">
        <span class="drug-tag">${info.type}</span>
        <span class="drug-tag">${info.freq}</span>
        <span class="drug-tag">${info.doseRange}</span>
      </div>
      <div class="drug-desc">${info.desc}</div>
    </div>`).join('');
  document.getElementById('drugCards').innerHTML = cards;
}

// ===== Init =====
document.getElementById('manualDate').value = todayISO();
document.getElementById('weightDate').value = todayISO();
document.getElementById('waistDate').value = todayISO();
document.getElementById('indDate').value = todayISO();
document.getElementById('sidefxDate').value = todayISO();

const today = new Date().getDay();
document.getElementById('weekdaySelect').value = today;

refreshHome();
refreshDrugsTab();

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Storage change listener
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) refreshHome();
});

// Visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    refreshHome();
    checkAndNotify();
  }
});

// Periodic notification check (every 5 min)
setInterval(checkAndNotify, 5 * 60 * 1000);

// Check on load
setTimeout(checkAndNotify, 2000);

console.log('🔔 GLP-1 用药助手 v1.4 已就绪');
