// ===== GLP-1 用药助手 v1.4 — 共享数据层 =====

export const STORAGE_KEY = 'glp1_assistant_data'

export const DEFAULT_DATA = {
  reminder: null,
  injections: [],
  weights: [],
  sideEffects: [],
  height: null,
  waists: [],
  healthIndicators: []
}

// ===== Drug info library =====
export const DRUG_INFO = {
  semaglutide_ozempic: { name: '司美格鲁肽', brand: 'Ozempic', generic: 'Semaglutide', type: '注射笔', freq: '每周一次', doseRange: '0.25-2.0 mg', desc: '诺和诺德生产，用于2型糖尿病血糖控制，兼具减重效果。起始剂量0.25mg，4周后增至0.5mg。' },
  semaglutide_wegovy: { name: '司美格鲁肽', brand: 'Wegovy', generic: 'Semaglutide', type: '注射笔', freq: '每周一次', doseRange: '0.25-2.4 mg', desc: '诺和诺德生产，专门获批用于体重管理（BMI≥30或BMI≥27伴合并症）。剂量逐步递增至2.4mg。' },
  liraglutide: { name: '利拉鲁肽', brand: 'Saxenda/Victoza', generic: 'Liraglutide', type: '注射笔', freq: '每天一次', doseRange: '0.6-3.0 mg', desc: '诺和诺德生产。Victoza用于糖尿病，Saxenda用于减重。需每天皮下注射，起始0.6mg逐步增至3.0mg。' },
  dulaglutide: { name: '度拉糖肽', brand: 'Trulicity', generic: 'Dulaglutide', type: '一次性自动注射笔', freq: '每周一次', doseRange: '0.75-4.5 mg', desc: '礼来公司生产。一次性预填充注射笔，操作简便。用于2型糖尿病，起始0.75mg。' },
  tirzepatide: { name: '替尔泊肽', brand: 'Mounjaro', generic: 'Tirzepatide', type: '注射笔', freq: '每周一次', doseRange: '2.5-15 mg', desc: '礼来公司生产，GIP/GLP-1双受体激动剂。减重效果显著，起始2.5mg逐步递增。' },
  semaglutide_oral: { name: '司美格鲁肽口服', brand: 'Rybelsus', generic: 'Oral Semaglutide', type: '口服片剂', freq: '每天一次', doseRange: '3-14 mg', desc: '诺和诺德生产，唯一的口服GLP-1制剂。需空腹服用，少量水送服，服药后至少等30分钟再进食。' },
  other: { name: '其他GLP-1药物', brand: '--', generic: '--', type: '--', freq: '--', doseRange: '--', desc: '请根据医生处方使用。GLP-1受体激动剂通过模拟肠促胰素来调节血糖和食欲。' }
}

const MISSED_DOSE_WINDOWS = {
  semaglutide_ozempic: 5 * 86400000,
  semaglutide_wegovy: 5 * 86400000,
  dulaglutide: 4 * 86400000,
  tirzepatide: 4 * 86400000,
  liraglutide: 24 * 3600000,
  semaglutide_oral: 24 * 3600000,
  other: 0
}

export const SITE_NAMES = {
  'abdomen-ul': '腹部左上', 'abdomen-lm': '腹部左中', 'abdomen-ur': '腹部右上',
  'abdomen-rm': '腹部右中', 'abdomen-ll': '腹部左下', 'abdomen-lr': '腹部右下',
  'thigh-left': '左大腿', 'thigh-right': '右大腿', 'arm-left': '左上臂', 'arm-right': '右上臂'
}

export const ALL_SITES = ['abdomen-ul', 'abdomen-lm', 'abdomen-ur', 'abdomen-rm', 'abdomen-ll', 'abdomen-lr', 'thigh-left', 'thigh-right', 'arm-left', 'arm-right']

export const SYMPTOM_NAMES = {
  nausea: '🤢 恶心', vomiting: '🤮 呕吐', diarrhea: '💩 腹泻', constipation: '😣 便秘',
  headache: '🤕 头痛', fatigue: '😴 疲劳', dizziness: '😵 头晕',
  appetite_loss: '🍽️ 食欲减退', injection_reaction: '🔴 注射反应'
}

export const SYMPTOM_KEYS = Object.keys(SYMPTOM_NAMES)

export const SEVERITY_LABELS = { mild: '轻度', moderate: '中度', severe: '重度' }

export const FATTY_LIVER_LABELS = {
  none: '无脂肪肝', mild: '轻度脂肪肝', moderate: '中度脂肪肝', severe: '重度脂肪肝'
}

export const DOSE_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.4, 2.5, 3.0, 4.0, 4.5, 5.0, 7.5, 10.0, 12.5, 15.0]

export const DRUG_OPTIONS = [
  { value: 'semaglutide_ozempic', label: '司美格鲁肽 (Ozempic)' },
  { value: 'semaglutide_wegovy', label: '司美格鲁肽 (Wegovy)' },
  { value: 'liraglutide', label: '利拉鲁肽 (Saxenda/Victoza)' },
  { value: 'dulaglutide', label: '度拉糖肽 (Trulicity)' },
  { value: 'tirzepatide', label: '替尔泊肽 (Mounjaro)' },
  { value: 'semaglutide_oral', label: '司美格鲁肽口服 (Rybelsus)' },
  { value: 'other', label: '其他' }
]

export const SITE_OPTIONS = [
  { value: '', label: '请选择' },
  ...Object.entries(SITE_NAMES).map(([k, v]) => ({ value: k, label: v }))
]

// ===== Data helpers =====
export function loadData() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      ...DEFAULT_DATA,
      ...parsed,
      waists: parsed.waists || [],
      healthIndicators: parsed.healthIndicators || [],
      height: parsed.height || null
    }
  } catch { return { ...DEFAULT_DATA } }
}

export function saveData(data) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(data))
}

// ===== Format helpers =====
export function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function fmtDateShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth()+1}/${d.getDate()}`
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ===== BMI =====
export function calcBMI(weightKg, heightCm) {
  if (!heightCm || heightCm <= 0) return null
  const h = heightCm / 100
  return weightKg / (h * h)
}

export function getBMILevel(bmi) {
  if (bmi === null) return { level: '', color: '#999', label: '' }
  if (bmi < 18.5) return { level: 'underweight', color: '#3498DB', label: '偏瘦' }
  if (bmi < 24) return { level: 'normal', color: '#4CAF80', label: '正常' }
  if (bmi < 28) return { level: 'overweight', color: '#F39C12', label: '超重' }
  return { level: 'obese', color: '#E74C3C', label: '肥胖' }
}

// ===== Next injection calculation =====
function localDateKey(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getNextInjection(data, now = new Date()) {
  if (!data.reminder) return null
  const { frequency, weekday, time = '08:00', drug } = data.reminder
  const [h, m] = (time || '08:00').split(':').map(Number)
  const periodMs = frequency === 'daily' ? 86400000
    : frequency === 'weekly' ? 7 * 86400000
    : frequency === 'biweekly' ? 14 * 86400000
    : 0
  if (!periodMs) return null

  let scheduled = new Date(now)
  scheduled.setHours(h, m, 0, 0)
  if (frequency !== 'daily') {
    const targetDay = Number.parseInt(weekday, 10)
    if (!Number.isInteger(targetDay) || targetDay < 0 || targetDay > 6) return null
    scheduled.setDate(scheduled.getDate() - ((scheduled.getDay() - targetDay + 7) % 7))
    if (frequency === 'biweekly' && data.reminder.scheduleAnchor) {
      const anchor = new Date(data.reminder.scheduleAnchor)
      if (!Number.isNaN(anchor.getTime())) {
        anchor.setHours(h, m, 0, 0)
        const periods = Math.floor((scheduled - anchor) / periodMs)
        scheduled = new Date(anchor.getTime() + periods * periodMs)
      }
    }
  }
  if (scheduled > now) return scheduled

  const allowedWindow = MISSED_DOSE_WINDOWS[drug] ?? Math.max(0, periodMs - 1)
  const deadline = new Date(scheduled.getTime() + Math.min(allowedWindow, periodMs))
  const startKey = localDateKey(scheduled)
  const deadlineKey = localDateKey(deadline)
  const completed = (data.injections || []).some(injection => {
    if (drug && injection.drug && injection.drug !== drug) return false
    const key = localDateKey(injection.date)
    return key && key >= startKey && key <= deadlineKey
  })
  if (!completed && now <= deadline) return scheduled

  let next = new Date(scheduled.getTime() + periodMs)
  while (next <= now) next = new Date(next.getTime() + periodMs)
  return next
}

// ===== CSV export =====
export function exportCSV(data) {
  const lines = []
  lines.push('\uFEFF注射记录')
  lines.push('日期,药品,剂量(mg),部位,备注')
  data.injections.forEach(i => {
    lines.push([i.date, i.drugName || DRUG_INFO[i.drug]?.brand || i.drug, i.dose, i.siteName || SITE_NAMES[i.site] || i.site, i.note || ''].join(','))
  })
  lines.push('')
  lines.push('体重记录')
  lines.push('日期,体重(kg)')
  data.weights.forEach(w => lines.push(`${w.date},${w.weight}`))
  if (data.waists.length > 0) {
    lines.push('')
    lines.push('腰围记录')
    lines.push('日期,腰围(cm)')
    data.waists.forEach(w => lines.push(`${w.date},${w.waist}`))
  }
  lines.push('')
  lines.push('副作用记录')
  lines.push('日期,症状,严重程度,备注')
  data.sideEffects.forEach(s => {
    lines.push([s.date, s.symptoms.map(sy => (SYMPTOM_NAMES[sy] || sy).replace(/[^\u4e00-\u9fa5]/g,'').trim()).join('/'), SEVERITY_LABELS[s.severity], s.note || ''].join(','))
  })
  if (data.healthIndicators.length > 0) {
    lines.push('')
    lines.push('健康指标')
    lines.push('日期,TC,TG,HDL,LDL,脂肪肝')
    data.healthIndicators.forEach(h => {
      lines.push([h.date, h.tc ?? '', h.tg ?? '', h.hdl ?? '', h.ldl ?? '', h.fattyLiver ? FATTY_LIVER_LABELS[h.fattyLiver] : ''].join(','))
    })
  }
  return lines.join('\n')
}
