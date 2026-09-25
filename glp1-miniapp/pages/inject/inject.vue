<template>
<scroll-view class="page" scroll-y>
  <!-- Reminder Settings -->
  <view class="card">
    <view class="card-label">⏰ 用药提醒设置</view>
    <view class="form-group">
      <view class="form-label">用药频率</view>
      <picker :value="freqIndex" :range="freqOptions" @change="onFreqChange">
        <view class="picker-val">{{ freqOptions[freqIndex] }}</view>
      </picker>
    </view>
    <view class="form-group" v-if="reminder.frequency !== 'daily'">
      <view class="form-label">注射日（周几）</view>
      <picker :value="weekdayIndex" :range="weekdayOptions" @change="onWeekdayChange">
        <view class="picker-val">{{ weekdayOptions[weekdayIndex] }}</view>
      </picker>
    </view>
    <view class="form-group">
      <view class="form-label">提醒时间</view>
      <picker mode="time" :value="reminder.time" @change="onTimeChange">
        <view class="picker-val">{{ reminder.time || '08:00' }}</view>
      </picker>
    </view>
    <view class="form-group">
      <view class="form-label">选择药品</view>
      <picker :value="drugIndex" :range="drugLabels" @change="onDrugChange">
        <view class="picker-val">{{ drugLabels[drugIndex] }}</view>
      </picker>
    </view>
    <view class="form-group">
      <view class="form-label">剂量 (mg)</view>
      <picker :value="doseIndex" :range="doseLabels" @change="onDoseChange">
        <view class="picker-val">{{ doseLabels[doseIndex] }}</view>
      </picker>
    </view>
    <button class="btn btn-primary btn-full" @click="saveReminder">💾 保存用药计划</button>
  </view>

  <!-- Injection Site Map -->
  <view class="card">
    <view class="card-label">📍 注射部位轮换</view>
    <view class="site-grid">
      <view
        v-for="site in ALL_SITES" :key="site"
        class="site-zone"
        :class="{ selected: selectedSite === site, 'last-used': lastUsedSite === site }"
        @click="selectSite(site)"
      >{{ SITE_NAMES[site] }}</view>
    </view>
    <view class="hint">💡 点击选择本次注射部位</view>
  </view>

  <!-- Manual Record -->
  <view class="card">
    <view class="card-label">📝 手动记录注射</view>
    <view class="form-group">
      <view class="form-label">注射日期</view>
      <picker mode="date" :value="manualDate" @change="onManualDateChange">
        <view class="picker-val">{{ manualDate }}</view>
      </picker>
    </view>
    <view class="form-group">
      <view class="form-label">药品</view>
      <picker :value="manualDrugIdx" :range="drugLabels" @change="onManualDrugChange">
        <view class="picker-val">{{ drugLabels[manualDrugIdx] }}</view>
      </picker>
    </view>
    <view class="form-group">
      <view class="form-label">剂量 (mg)</view>
      <picker :value="manualDoseIdx" :range="doseLabels" @change="onManualDoseChange">
        <view class="picker-val">{{ doseLabels[manualDoseIdx] }}</view>
      </picker>
    </view>
    <view class="form-group">
      <view class="form-label">注射部位</view>
      <picker :value="manualSiteIdx" :range="siteLabels" @change="onManualSiteChange">
        <view class="picker-val">{{ siteLabels[manualSiteIdx] }}</view>
      </picker>
    </view>
    <view class="form-group">
      <view class="form-label">备注</view>
      <input class="input" v-model="manualNote" placeholder="选填" />
    </view>
    <button class="btn btn-primary btn-full" @click="recordManual">✅ 记录本次注射</button>
  </view>

  <!-- Injection History -->
  <view class="card">
    <view class="card-label">📜 注射历史</view>
    <view v-if="history.length === 0" class="empty-state">暂无记录</view>
    <view v-for="(inj, idx) in history" :key="idx" class="history-item">
      <view class="hi-left">
        <view class="hi-date">{{ fmtDate(inj.date) }}</view>
        <view class="hi-detail">{{ inj.drugName || drugBrand(inj.drug) }} · {{ inj.siteName || siteNameStr(inj.site) }}</view>
      </view>
      <view class="hi-right">
        <view class="hi-dose-wrap">
          <text class="hi-dose">{{ inj.dose }} mg</text>
          <text class="hi-note" v-if="inj.note">{{ inj.note }}</text>
        </view>
        <text class="btn-del" @click="deleteInjection(inj._idx)">✕</text>
      </view>
    </view>
    <button class="btn btn-danger btn-sm btn-full" style="margin-top:24rpx" @click="clearHistory">🗑️ 清空历史</button>
  </view>
</scroll-view>
</template>

<script>
import {
  loadData, saveData, fmtDate, todayISO,
  DRUG_INFO, SITE_NAMES, ALL_SITES,
  DOSE_OPTIONS, DRUG_OPTIONS, SITE_OPTIONS
} from '@/utils/store.js'

export default {
  data() {
    return {
      ALL_SITES,
      SITE_NAMES,
      freqOptions: ['每天一次', '每周一次', '每两周一次'],
      freqIndex: 1,
      weekdayOptions: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      weekdayIndex: 1,
      reminder: { frequency: 'weekly', weekday: '1', time: '08:00', drug: 'semaglutide_ozempic', drugName: 'Ozempic', dose: 0.5 },
      drugOptions: DRUG_OPTIONS,
      drugLabels: DRUG_OPTIONS.map(d => d.label),
      drugIndex: 0,
      doseOptions: DOSE_OPTIONS,
      doseLabels: DOSE_OPTIONS.map(d => d + ' mg'),
      doseIndex: 1,
      selectedSite: '',
      lastUsedSite: '',
      manualDate: todayISO(),
      manualDrugIdx: 0,
      manualDoseIdx: 1,
      manualSiteIdx: 0,
      manualNote: '',
      siteLabels: SITE_OPTIONS.map(s => s.label),
      history: []
    }
  },
  onShow() { this.refresh() },
  methods: {
    fmtDate,
    siteNameStr(s) { return SITE_NAMES[s] || s || '' },
    drugBrand(d) { return DRUG_INFO[d]?.brand || d || '' },

    refresh() {
      const d = loadData()
      if (d.reminder) {
        this.reminder = { ...d.reminder }
        this.freqIndex = ['daily', 'weekly', 'biweekly'].indexOf(d.reminder.frequency)
        if (this.freqIndex < 0) this.freqIndex = 1
        this.weekdayIndex = parseInt(d.reminder.weekday) || 0
        this.drugIndex = DRUG_OPTIONS.findIndex(o => o.value === d.reminder.drug)
        if (this.drugIndex < 0) this.drugIndex = 0
        this.doseIndex = DOSE_OPTIONS.indexOf(d.reminder.dose)
        if (this.doseIndex < 0) this.doseIndex = 1
      }
      this.manualDate = todayISO()
      this.manualNote = ''
      this.selectedSite = ''
      this.manualSiteIdx = 0

      const lastInj = d.injections[d.injections.length - 1]
      this.lastUsedSite = lastInj ? lastInj.site : ''

      if (d.reminder) {
        this.manualDrugIdx = DRUG_OPTIONS.findIndex(o => o.value === d.reminder.drug)
        if (this.manualDrugIdx < 0) this.manualDrugIdx = 0
        this.manualDoseIdx = DOSE_OPTIONS.indexOf(d.reminder.dose)
        if (this.manualDoseIdx < 0) this.manualDoseIdx = 1
      }

      const hist = [...d.injections].reverse()
      this.history = hist.map(i => {
        const origIdx = d.injections.indexOf(i)
        return { ...i, _idx: origIdx }
      })
    },

    selectSite(site) {
      this.selectedSite = (this.selectedSite === site) ? '' : site
      this.manualSiteIdx = SITE_OPTIONS.findIndex(s => s.value === this.selectedSite)
      if (this.manualSiteIdx < 0) this.manualSiteIdx = 0
    },

    onFreqChange(e) { this.freqIndex = e.detail.value; this.reminder.frequency = ['daily', 'weekly', 'biweekly'][this.freqIndex] },
    onWeekdayChange(e) { this.weekdayIndex = e.detail.value; this.reminder.weekday = String(this.weekdayIndex) },
    onTimeChange(e) { this.reminder.time = e.detail.value },
    onDrugChange(e) {
      this.drugIndex = e.detail.value
      this.reminder.drug = DRUG_OPTIONS[this.drugIndex].value
      this.reminder.drugName = DRUG_INFO[this.reminder.drug]?.brand || this.reminder.drug
    },
    onDoseChange(e) { this.doseIndex = e.detail.value; this.reminder.dose = DOSE_OPTIONS[this.doseIndex] },
    onManualDateChange(e) { this.manualDate = e.detail.value },
    onManualDrugChange(e) { this.manualDrugIdx = e.detail.value },
    onManualDoseChange(e) { this.manualDoseIdx = e.detail.value },
    onManualSiteChange(e) {
      this.manualSiteIdx = e.detail.value
      this.selectedSite = SITE_OPTIONS[this.manualSiteIdx].value
    },

    saveReminder() {
      const d = loadData()
      d.reminder = { ...this.reminder, scheduleAnchor: new Date().toISOString() }
      saveData(d)
      uni.showToast({ title: '已保存', icon: 'success' })
    },

    recordManual() {
      const siteVal = SITE_OPTIONS[this.manualSiteIdx].value
      if (!siteVal) { uni.showToast({ title: '请选择注射部位', icon: 'none' }); return }
      const d = loadData()
      const drugVal = DRUG_OPTIONS[this.manualDrugIdx].value
      d.injections.push({
        date: this.manualDate,
        drug: drugVal,
        drugName: DRUG_INFO[drugVal]?.brand || drugVal,
        dose: DOSE_OPTIONS[this.manualDoseIdx],
        site: siteVal,
        siteName: SITE_NAMES[siteVal] || siteVal,
        note: this.manualNote.trim()
      })
      d.injections.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
      saveData(d)
      this.selectedSite = ''
      this.manualSiteIdx = 0
      this.manualNote = ''
      this.manualDate = todayISO()
      this.refresh()
      uni.showToast({ title: '已记录', icon: 'success' })
    },

    async deleteInjection(idx) {
      const res = await uni.showModal({ title: '确认删除', content: '确定删除这条注射记录吗？', confirmColor: '#E74C3C' })
      if (!res.confirm) return
      const d = loadData()
      d.injections.splice(idx, 1)
      saveData(d)
      this.refresh()
      uni.showToast({ title: '已删除', icon: 'none' })
    },

    async clearHistory() {
      const res = await uni.showModal({ title: '确认清空', content: '确定清空所有注射历史吗？不可恢复。', confirmColor: '#E74C3C' })
      if (!res.confirm) return
      const d = loadData()
      d.injections = []
      saveData(d)
      this.refresh()
      uni.showToast({ title: '已清空', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.page { padding: 20rpx 20rpx 40rpx; height: 100vh; }
.card { background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06); }
.card-label { font-size: 26rpx; font-weight: 600; color: #2C3E50; margin-bottom: 20rpx; }

/* Form */
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 24rpx; font-weight: 600; color: #7F8C8D; margin-bottom: 8rpx; }
.picker-val { padding: 20rpx 24rpx; background: #F5F7FA; border-radius: 10rpx; font-size: 28rpx; color: #2C3E50; border: 2rpx solid #E8ECF1; }
.input { padding: 20rpx 24rpx; background: #F5F7FA; border-radius: 10rpx; font-size: 28rpx; border: 2rpx solid #E8ECF1; width: 100%; }

/* Buttons */
.btn { display: flex; align-items: center; justify-content: center; border: none; border-radius: 10rpx; font-size: 28rpx; font-weight: 600; padding: 20rpx 40rpx; }
.btn-primary { background: #4CAF80; color: #fff; }
.btn-danger { background: #E74C3C; color: #fff; }
.btn-sm { padding: 16rpx 28rpx; font-size: 26rpx; }
.btn-full { width: 100%; margin-top: 12rpx; }

/* Site Grid */
.site-grid { display: flex; flex-wrap: wrap; gap: 12rpx; justify-content: center; margin: 16rpx 0; }
.site-zone { padding: 20rpx 16rpx; border-radius: 12rpx; border: 2rpx solid #E8ECF1; background: #F5F7FA; font-size: 26rpx; font-weight: 500; min-width: 140rpx; text-align: center; }
.site-zone.selected { border-color: #4CAF80; background: #E8F5EC; color: #3D8B65; }
.site-zone.last-used { border-color: #F39C12; background: #FFF8E1; }
.hint { font-size: 22rpx; color: #7F8C8D; text-align: center; margin-top: 12rpx; }

/* History */
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #E8ECF1; }
.history-item:last-child { border-bottom: none; }
.hi-left { display: flex; flex-direction: column; gap: 4rpx; }
.hi-date { font-size: 24rpx; color: #7F8C8D; }
.hi-detail { font-size: 28rpx; font-weight: 500; }
.hi-right { display: flex; align-items: center; gap: 12rpx; }
.hi-dose-wrap { text-align: right; }
.hi-dose { font-size: 30rpx; font-weight: 600; color: #3D8B65; display: block; }
.hi-note { font-size: 22rpx; color: #7F8C8D; }
.btn-del { color: #E74C3C; font-size: 28rpx; padding: 4rpx; }
.empty-state { text-align: center; padding: 40rpx; color: #7F8C8D; font-size: 26rpx; }

button::after { display: none; }
</style>
