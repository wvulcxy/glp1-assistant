<template>
<scroll-view class="page" scroll-y>
  <!-- Record Side Effects -->
  <view class="card">
    <view class="card-label">✍️ 记录副作用</view>
    <view class="form-group">
      <view class="form-label">日期</view>
      <picker mode="date" :value="formDate" @change="e=>formDate=e.detail.value">
        <view class="picker-val">{{ formDate }}</view>
      </picker>
    </view>
    <view class="form-group">
      <view class="form-label">症状类型</view>
      <view class="chip-group">
        <view
          v-for="s in SYMPTOM_KEYS" :key="s"
          class="chip"
          :class="{ selected: selectedSymptoms.has(s) }"
          @click="toggleSymptom(s)"
        >{{ SYMPTOM_NAMES[s] }}</view>
      </view>
    </view>
    <view class="form-group">
      <view class="form-label">严重程度</view>
      <view class="severity-group">
        <view
          v-for="sev in severities" :key="sev.value"
          class="severity-btn"
          :class="{ selected: selectedSeverity === sev.value }"
          @click="selectedSeverity = sev.value"
        >{{ sev.label }}</view>
      </view>
    </view>
    <view class="form-group">
      <view class="form-label">备注</view>
      <textarea class="textarea" v-model="formNote" placeholder="选填" :maxlength="200" />
    </view>
    <button class="btn btn-primary btn-full" @click="recordSidefx">📝 记录</button>
  </view>

  <!-- Side Effects History -->
  <view class="card">
    <view class="card-label">📜 副作用历史</view>
    <view v-if="history.length === 0" class="empty-state">暂无记录</view>
    <view v-for="(s, idx) in history" :key="idx" class="sfx-item">
      <view class="sfx-header">
        <text class="sfx-date">{{ fmtDate(s.date) }}</text>
        <view class="sfx-header-right">
          <text class="sfx-severity" :class="s.severity">{{ SEVERITY_LABELS[s.severity] }}</text>
          <text class="btn-del" @click="deleteSidefx(s)">✕</text>
        </view>
      </view>
      <view class="sfx-symptoms">{{ symptomDisplay(s.symptoms) }}</view>
      <view class="sfx-note" v-if="s.note">{{ s.note }}</view>
    </view>
  </view>
</scroll-view>
</template>

<script>
import { loadData, saveData, fmtDate, todayISO, SYMPTOM_NAMES, SYMPTOM_KEYS, SEVERITY_LABELS } from '@/utils/store.js'

export default {
  data() {
    return {
      SYMPTOM_KEYS, SYMPTOM_NAMES, SEVERITY_LABELS,
      formDate: todayISO(),
      formNote: '',
      selectedSymptoms: new Set(),
      selectedSeverity: null,
      severities: [
        { value: 'mild', label: '轻度' },
        { value: 'moderate', label: '中度' },
        { value: 'severe', label: '重度' }
      ],
      history: []
    }
  },
  onShow() { this.refresh() },
  methods: {
    fmtDate,
    toggleSymptom(s) {
      const set = new Set(this.selectedSymptoms)
      if (set.has(s)) set.delete(s); else set.add(s)
      this.selectedSymptoms = set
    },
    symptomDisplay(symptoms) {
      return symptoms.map(s => SYMPTOM_NAMES[s] || s).join(' ')
    },

    refresh() {
      const d = loadData()
      this.formDate = todayISO()
      this.formNote = ''
      this.selectedSymptoms = new Set()
      this.selectedSeverity = null

      const hist = [...d.sideEffects].reverse()
      this.history = hist
    },

    recordSidefx() {
      if (this.selectedSymptoms.size === 0) { uni.showToast({ title: '请选择至少一个症状', icon: 'none' }); return }
      if (!this.selectedSeverity) { uni.showToast({ title: '请选择严重程度', icon: 'none' }); return }
      const d = loadData()
      d.sideEffects.push({
        date: this.formDate,
        symptoms: [...this.selectedSymptoms],
        severity: this.selectedSeverity,
        note: this.formNote.trim()
      })
      d.sideEffects.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
      saveData(d)
      this.refresh()
      uni.showToast({ title: '已记录', icon: 'success' })
    },

    async deleteSidefx(s) {
      const res = await uni.showModal({ title: '确认删除', content: `删除 ${s.date} 的副作用记录？`, confirmColor: '#E74C3C' })
      if (!res.confirm) return
      const d = loadData()
      d.sideEffects = d.sideEffects.filter(sf => !(sf.date === s.date && sf.symptoms.join(',') === s.symptoms.join(',')))
      saveData(d)
      this.refresh()
      uni.showToast({ title: '已删除', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.page { padding: 20rpx 20rpx 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06); }
.card-label { font-size: 26rpx; font-weight: 600; color: #2C3E50; margin-bottom: 20rpx; }

/* Form */
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 24rpx; font-weight: 600; color: #7F8C8D; margin-bottom: 8rpx; }
.picker-val { padding: 20rpx 24rpx; background: #F5F7FA; border-radius: 10rpx; font-size: 28rpx; color: #2C3E50; border: 2rpx solid #E8ECF1; }
.textarea { padding: 20rpx 24rpx; background: #F5F7FA; border-radius: 10rpx; font-size: 28rpx; border: 2rpx solid #E8ECF1; width: 100%; min-height: 120rpx; }

/* Chips */
.chip-group { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip { padding: 14rpx 24rpx; border-radius: 40rpx; border: 2rpx solid #E8ECF1; background: #F5F7FA; font-size: 24rpx; color: #2C3E50; }
.chip.selected { background: #E8F5EC; border-color: #4CAF80; color: #3D8B65; }

/* Severity */
.severity-group { display: flex; gap: 16rpx; }
.severity-btn { flex: 1; padding: 20rpx; border-radius: 10rpx; border: 2rpx solid #E8ECF1; background: #F5F7FA; font-size: 28rpx; text-align: center; color: #2C3E50; }
.severity-btn.selected { border-color: #4CAF80; background: #E8F5EC; }

/* Buttons */
.btn { display: flex; align-items: center; justify-content: center; border: none; border-radius: 10rpx; font-size: 28rpx; font-weight: 600; padding: 20rpx 40rpx; }
.btn-primary { background: #4CAF80; color: #fff; }
.btn-full { width: 100%; margin-top: 12rpx; }

/* History */
.sfx-item { padding: 20rpx 0; border-bottom: 1rpx solid #E8ECF1; }
.sfx-item:last-child { border-bottom: none; }
.sfx-header { display: flex; justify-content: space-between; align-items: center; }
.sfx-date { font-size: 24rpx; color: #7F8C8D; }
.sfx-header-right { display: flex; align-items: center; gap: 12rpx; }
.sfx-severity { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; font-weight: 600; }
.sfx-severity.mild { background: #E8F5EC; color: #4CAF80; }
.sfx-severity.moderate { background: #FFF8E1; color: #F39C12; }
.sfx-severity.severe { background: #FDEDEC; color: #E74C3C; }
.sfx-symptoms { font-size: 26rpx; margin-top: 8rpx; }
.sfx-note { font-size: 24rpx; color: #7F8C8D; margin-top: 4rpx; font-style: italic; }
.btn-del { color: #E74C3C; font-size: 28rpx; padding: 4rpx; }
.empty-state { text-align: center; padding: 40rpx; color: #7F8C8D; font-size: 26rpx; }

button::after { display: none; }
</style>
