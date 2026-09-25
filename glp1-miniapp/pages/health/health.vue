<template>
<scroll-view class="page" scroll-y>
  <!-- Sub-navigation -->
  <view class="sub-nav">
    <view class="sub-nav-btn" :class="{ active: subTab === 'weight' }" @click="subTab='weight'">⚖️ 体重</view>
    <view class="sub-nav-btn" :class="{ active: subTab === 'waist' }" @click="subTab='waist'">📏 腰围</view>
    <view class="sub-nav-btn" :class="{ active: subTab === 'indicators' }" @click="subTab='indicators'">🩺 指标</view>
  </view>

  <!-- Weight sub-tab -->
  <view v-show="subTab === 'weight'">
    <!-- Height & BMI -->
    <view class="card">
      <view class="card-label">📐 身高 & BMI</view>
      <view class="height-row">
        <view class="form-group" style="flex:1;margin-bottom:0;">
          <view class="form-label">身高 (cm)</view>
          <input class="input" v-model="heightInput" type="digit" placeholder="如 170" />
        </view>
        <button class="btn btn-primary btn-sm" @click="saveHeight">💾 保存</button>
      </view>
      <view class="bmi-display">
        <view class="bmi-value" :style="{ color: bmiColor }">{{ bmiText }}</view>
        <view class="bmi-label">{{ bmiSubText }}</view>
        <view class="bmi-level" :style="{ color: bmiColor }" v-if="bmiLevel">{{ bmiLevel }}</view>
      </view>
    </view>

    <!-- Weight Chart -->
    <view class="card">
      <view class="card-label">📊 体重变化</view>
      <canvas type="2d" id="weightCanvas" class="chart-canvas" v-if="weights.length >= 2"></canvas>
      <view v-else class="empty-state">至少需要2条记录才能显示图表</view>
      <view class="summary-row" v-if="weights.length > 0">
        <view class="ws-item"><text class="ws-label">起始体重</text><text class="ws-val">{{ weights[0].weight }} kg</text></view>
        <view class="ws-item"><text class="ws-label">当前体重</text><text class="ws-val">{{ currentWeight }} kg</text></view>
        <view class="ws-item"><text class="ws-label">已减</text><text class="ws-val">{{ weightLost }} kg</text></view>
      </view>
    </view>

    <!-- Record Weight -->
    <view class="card">
      <view class="card-label">✍️ 记录体重</view>
      <view class="form-group">
        <view class="form-label">日期</view>
        <picker mode="date" :value="weightDate" @change="e=>weightDate=e.detail.value">
          <view class="picker-val">{{ weightDate }}</view>
        </picker>
      </view>
      <view class="form-group">
        <view class="form-label">体重 (kg)</view>
        <input class="input" v-model="weightInput" type="digit" placeholder="如 75.5" />
      </view>
      <button class="btn btn-primary btn-full" @click="recordWeight">📝 记录体重</button>
    </view>

    <!-- Weight History -->
    <view class="card">
      <view class="card-label">📋 体重记录</view>
      <view v-if="weights.length === 0" class="empty-state">暂无记录</view>
      <view v-for="(w, idx) in weightsReversed" :key="idx" class="history-item">
        <view class="hi-left"><view class="hi-date">{{ fmtDate(w.date) }}</view></view>
        <view class="hi-right">
          <text class="hi-dose">{{ w.weight }} kg</text>
          <text class="btn-del" @click="deleteWeight(w)">✕</text>
        </view>
      </view>
    </view>
  </view>

  <!-- Waist sub-tab -->
  <view v-show="subTab === 'waist'">
    <view class="card">
      <view class="card-label">📊 腰围变化</view>
      <canvas type="2d" id="waistCanvas" class="chart-canvas" v-if="waists.length >= 2"></canvas>
      <view v-else class="empty-state">至少需要2条记录才能显示图表</view>
      <view class="summary-row" v-if="waists.length > 0">
        <view class="ws-item"><text class="ws-label">起始腰围</text><text class="ws-val">{{ waists[0].waist }} cm</text></view>
        <view class="ws-item"><text class="ws-label">当前腰围</text><text class="ws-val">{{ currentWaist }} cm</text></view>
        <view class="ws-item"><text class="ws-label">已减</text><text class="ws-val">{{ waistLost }} cm</text></view>
      </view>
    </view>

    <view class="card">
      <view class="card-label">✍️ 记录腰围</view>
      <view class="form-group">
        <view class="form-label">日期</view>
        <picker mode="date" :value="waistDate" @change="e=>waistDate=e.detail.value">
          <view class="picker-val">{{ waistDate }}</view>
        </picker>
      </view>
      <view class="form-group">
        <view class="form-label">腰围 (cm)</view>
        <input class="input" v-model="waistInput" type="digit" placeholder="如 85" />
      </view>
      <button class="btn btn-primary btn-full" @click="recordWaist">📝 记录腰围</button>
    </view>

    <view class="card">
      <view class="card-label">📋 腰围记录</view>
      <view v-if="waists.length === 0" class="empty-state">暂无记录</view>
      <view v-for="(w, idx) in waistsReversed" :key="idx" class="history-item">
        <view class="hi-left"><view class="hi-date">{{ fmtDate(w.date) }}</view></view>
        <view class="hi-right">
          <text class="hi-dose">{{ w.waist }} cm</text>
          <text class="btn-del" @click="deleteWaist(w)">✕</text>
        </view>
      </view>
    </view>
  </view>

  <!-- Indicators sub-tab -->
  <view v-show="subTab === 'indicators'">
    <view class="card">
      <view class="card-label">🩺 健康指标录入</view>
      <view class="form-group">
        <view class="form-label">日期</view>
        <picker mode="date" :value="indDate" @change="e=>indDate=e.detail.value">
          <view class="picker-val">{{ indDate }}</view>
        </picker>
      </view>
      <view class="form-group"><view class="form-label">总胆固醇 TC (mmol/L)</view><input class="input" v-model="indTC" type="digit" placeholder="如 5.2" /></view>
      <view class="form-group"><view class="form-label">甘油三酯 TG (mmol/L)</view><input class="input" v-model="indTG" type="digit" placeholder="如 1.7" /></view>
      <view class="form-group"><view class="form-label">高密度脂蛋白 HDL-C (mmol/L)</view><input class="input" v-model="indHDL" type="digit" placeholder="如 1.3" /></view>
      <view class="form-group"><view class="form-label">低密度脂蛋白 LDL-C (mmol/L)</view><input class="input" v-model="indLDL" type="digit" placeholder="如 3.1" /></view>
      <view class="form-group">
        <view class="form-label">脂肪肝等级</view>
        <picker :value="fattyLiverIdx" :range="fattyLiverLabels" @change="e=>fattyLiverIdx=e.detail.value">
          <view class="picker-val">{{ fattyLiverLabels[fattyLiverIdx] }}</view>
        </picker>
      </view>
      <button class="btn btn-primary btn-full" @click="recordIndicator">📝 记录指标</button>
    </view>

    <view class="card">
      <view class="card-label">📜 指标历史</view>
      <view v-if="indicators.length === 0" class="empty-state">暂无记录</view>
      <view v-for="(h, idx) in indicatorsReversed" :key="idx" class="ind-item">
        <view class="ind-header">
          <text class="ind-date">{{ fmtDate(h.date) }}</text>
          <text class="btn-del" @click="deleteIndicator(h)">✕</text>
        </view>
        <view class="ind-grid">
          <view class="ind-cell" v-if="h.tc != null"><text class="ic-label">TC</text><text class="ic-val">{{ h.tc }}</text></view>
          <view class="ind-cell" v-if="h.tg != null"><text class="ic-label">TG</text><text class="ic-val">{{ h.tg }}</text></view>
          <view class="ind-cell" v-if="h.hdl != null"><text class="ic-label">HDL</text><text class="ic-val">{{ h.hdl }}</text></view>
          <view class="ind-cell" v-if="h.ldl != null"><text class="ic-label">LDL</text><text class="ic-val">{{ h.ldl }}</text></view>
          <view class="ind-cell" v-if="h.fattyLiver"><text class="ic-label">脂肪肝</text><text class="ic-val">{{ FATTY_LIVER_LABELS[h.fattyLiver] }}</text></view>
        </view>
      </view>
    </view>
  </view>
</scroll-view>
</template>

<script>
import {
  loadData, saveData, fmtDate, todayISO, calcBMI, getBMILevel,
  FATTY_LIVER_LABELS
} from '@/utils/store.js'

export default {
  data() {
    return {
      FATTY_LIVER_LABELS,
      subTab: 'weight',
      heightInput: '',
      weights: [],
      waists: [],
      indicators: [],
      bmiText: '--',
      bmiSubText: '请先设置身高',
      bmiColor: '#4CAF80',
      bmiLevel: '',
      weightDate: todayISO(),
      weightInput: '',
      waistDate: todayISO(),
      waistInput: '',
      indDate: todayISO(),
      indTC: '', indTG: '', indHDL: '', indLDL: '',
      fattyLiverIdx: 0,
      fattyLiverLabels: ['无/未检查', '无脂肪肝', '轻度脂肪肝', '中度脂肪肝', '重度脂肪肝'],
      fattyLiverValues: ['', 'none', 'mild', 'moderate', 'severe']
    }
  },
  computed: {
    weightsReversed() { return [...this.weights].reverse() },
    waistsReversed() { return [...this.waists].reverse() },
    indicatorsReversed() { return [...this.indicators].reverse() },
    currentWeight() { const w = this.weights; return w.length > 0 ? w[w.length-1].weight : '--' },
    weightLost() { const w = this.weights; return w.length > 1 ? (w[0].weight - w[w.length-1].weight).toFixed(1) : '--' },
    currentWaist() { const w = this.waists; return w.length > 0 ? w[w.length-1].waist : '--' },
    waistLost() { const w = this.waists; return w.length > 1 ? (w[0].waist - w[w.length-1].waist).toFixed(1) : '--' }
  },
  onShow() { this.refresh() },
  watch: {
    subTab() {
      this.$nextTick(() => {
        if (this.subTab === 'weight') this.$nextTick(() => this.drawWeightChart())
        if (this.subTab === 'waist') this.$nextTick(() => this.drawWaistChart())
      })
    }
  },
  methods: {
    fmtDate,
    refresh() {
      const d = loadData()
      this.heightInput = d.height ? String(d.height) : ''
      this.weights = d.weights
      this.waists = d.waists
      this.indicators = d.healthIndicators
      this.updateBMI()
      this.$nextTick(() => {
        if (this.subTab === 'weight') this.$nextTick(() => this.drawWeightChart())
        if (this.subTab === 'waist') this.$nextTick(() => this.drawWaistChart())
      })
    },

    updateBMI() {
      const d = loadData()
      if (!d.height) {
        this.bmiText = '--'; this.bmiSubText = '请先设置身高'; this.bmiColor = '#4CAF80'; this.bmiLevel = ''
      } else if (d.weights.length === 0) {
        this.bmiText = '--'; this.bmiSubText = '暂无体重数据'; this.bmiColor = '#4CAF80'; this.bmiLevel = ''
      } else {
        const bmi = calcBMI(d.weights[d.weights.length-1].weight, d.height)
        if (bmi !== null) {
          const level = getBMILevel(bmi)
          this.bmiText = bmi.toFixed(1); this.bmiSubText = `BMI · 身高 ${d.height} cm`; this.bmiColor = level.color; this.bmiLevel = level.label
        }
      }
    },

    saveHeight() {
      const val = parseFloat(this.heightInput)
      if (!val || val < 50 || val > 300) { uni.showToast({ title: '请输入有效身高 (50-300 cm)', icon: 'none' }); return }
      const d = loadData(); d.height = val; saveData(d)
      this.updateBMI(); uni.showToast({ title: '已保存', icon: 'success' })
    },

    recordWeight() {
      const w = parseFloat(this.weightInput)
      if (!w || w <= 0) { uni.showToast({ title: '请输入有效体重', icon: 'none' }); return }
      const d = loadData(); d.weights.push({ date: this.weightDate, weight: w })
      d.weights.sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
      saveData(d); this.weightInput = ''; this.refresh(); uni.showToast({ title: '已记录', icon: 'success' })
    },

    recordWaist() {
      const w = parseFloat(this.waistInput)
      if (!w || w < 20 || w > 300) { uni.showToast({ title: '请输入有效腰围', icon: 'none' }); return }
      const d = loadData(); d.waists.push({ date: this.waistDate, waist: w })
      d.waists.sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
      saveData(d); this.waistInput = ''; this.refresh(); uni.showToast({ title: '已记录', icon: 'success' })
    },

    recordIndicator() {
      if (!this.indTC && !this.indTG && !this.indHDL && !this.indLDL && !this.fattyLiverValues[this.fattyLiverIdx]) {
        uni.showToast({ title: '请至少填写一项', icon: 'none' }); return
      }
      const d = loadData()
      d.healthIndicators.push({
        date: this.indDate,
        tc: this.indTC ? parseFloat(this.indTC) : null,
        tg: this.indTG ? parseFloat(this.indTG) : null,
        hdl: this.indHDL ? parseFloat(this.indHDL) : null,
        ldl: this.indLDL ? parseFloat(this.indLDL) : null,
        fattyLiver: this.fattyLiverValues[this.fattyLiverIdx] || null
      })
      d.healthIndicators.sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
      saveData(d); this.indTC=''; this.indTG=''; this.indHDL=''; this.indLDL=''; this.fattyLiverIdx=0
      this.refresh(); uni.showToast({ title: '已记录', icon: 'success' })
    },

    async deleteWeight(w) {
      const res = await uni.showModal({ title: '确认删除', content: `删除 ${w.date} 的体重记录？`, confirmColor: '#E74C3C' })
      if (!res.confirm) return
      const d = loadData(); d.weights = d.weights.filter(x => !(x.date===w.date && x.weight===w.weight))
      saveData(d); this.refresh(); uni.showToast({ title: '已删除', icon: 'none' })
    },

    async deleteWaist(w) {
      const res = await uni.showModal({ title: '确认删除', content: `删除 ${w.date} 的腰围记录？`, confirmColor: '#E74C3C' })
      if (!res.confirm) return
      const d = loadData(); d.waists = d.waists.filter(x => !(x.date===w.date && x.waist===w.waist))
      saveData(d); this.refresh(); uni.showToast({ title: '已删除', icon: 'none' })
    },

    async deleteIndicator(h) {
      const res = await uni.showModal({ title: '确认删除', content: `删除 ${h.date} 的指标记录？`, confirmColor: '#E74C3C' })
      if (!res.confirm) return
      const d = loadData()
      d.healthIndicators = d.healthIndicators.filter(x => !(x.date===h.date && JSON.stringify(x)===JSON.stringify(h)))
      saveData(d); this.refresh(); uni.showToast({ title: '已删除', icon: 'none' })
    },

    // Charts using uni.createSelectorQuery + Canvas 2D
    drawWeightChart() { this._drawChart('weightCanvas', this.weights, 'weight', '#4CAF80') },
    drawWaistChart() { this._drawChart('waistCanvas', this.waists, 'waist', '#9B59B6') },

    _drawChart(canvasId, data, valueKey, color) {
      if (data.length < 2) return
      const query = uni.createSelectorQuery().in(this)
      query.select('#' + canvasId).fields({ node: true, size: true }).exec(res => {
        if (!res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = uni.getSystemInfoSync().pixelRatio
        const w = res[0].width
        const h = res[0].height
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.scale(dpr, dpr)

        ctx.clearRect(0, 0, w, h)

        const pad = { top: 20, right: 16, bottom: 30, left: 40 }
        const plotW = w - pad.left - pad.right
        const plotH = h - pad.top - pad.bottom

        const values = data.map(d => d[valueKey])
        const minVal = Math.floor(Math.min(...values) - 2)
        const maxVal = Math.ceil(Math.max(...values) + 2)
        const range = maxVal - minVal || 1

        const toX = i => pad.left + (i / (data.length - 1)) * plotW
        const toY = v => pad.top + plotH - ((v - minVal) / range) * plotH

        // Grid
        ctx.strokeStyle = '#E8ECF1'; ctx.lineWidth = 0.5
        for (let i = 0; i <= 4; i++) {
          const y = pad.top + (plotH * i) / 4
          ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke()
          const val = maxVal - (range * i) / 4
          ctx.fillStyle = '#7F8C8D'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'
          ctx.fillText(val.toFixed(1), pad.left - 6, y + 3)
        }

        // Line
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
        ctx.beginPath()
        data.forEach((d, i) => {
          const x = toX(i), y = toY(d[valueKey])
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        })
        ctx.stroke()

        // Gradient fill
        const lastX = toX(data.length - 1)
        ctx.lineTo(lastX, pad.top + plotH)
        ctx.lineTo(toX(0), pad.top + plotH)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH)
        grad.addColorStop(0, this._hexToRgba(color, 0.25))
        grad.addColorStop(1, this._hexToRgba(color, 0.03))
        ctx.fillStyle = grad; ctx.fill()

        // Dots
        data.forEach((d, i) => {
          const x = toX(i), y = toY(d[valueKey])
          ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill()
        })

        // Date labels
        ctx.fillStyle = '#7F8C8D'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
        const step = Math.max(1, Math.floor(data.length / 5))
        for (let i = 0; i < data.length; i += step) {
          ctx.fillText(data[i].date.slice(5).replace('-','/'), toX(i), h - 6)
        }
        if (data.length > 1 && (data.length - 1) % step !== 0) {
          ctx.fillText(data[data.length-1].date.slice(5).replace('-','/'), toX(data.length-1), h - 6)
        }
      })
    },

    _hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      return `rgba(${r},${g},${b},${alpha})`
    }
  }
}
</script>

<style scoped>
.page { padding: 20rpx 20rpx 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06); }
.card-label { font-size: 26rpx; font-weight: 600; color: #2C3E50; margin-bottom: 20rpx; }

/* Sub Nav */
.sub-nav { display: flex; background: #fff; border-radius: 16rpx; padding: 8rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06); gap: 8rpx; }
.sub-nav-btn { flex: 1; padding: 20rpx; border-radius: 12rpx; text-align: center; font-size: 26rpx; font-weight: 600; color: #7F8C8D; }
.sub-nav-btn.active { background: #4CAF80; color: #fff; }

/* Form */
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 24rpx; font-weight: 600; color: #7F8C8D; margin-bottom: 8rpx; }
.input { padding: 20rpx 24rpx; background: #F5F7FA; border-radius: 10rpx; font-size: 28rpx; border: 2rpx solid #E8ECF1; width: 100%; }
.picker-val { padding: 20rpx 24rpx; background: #F5F7FA; border-radius: 10rpx; font-size: 28rpx; color: #2C3E50; border: 2rpx solid #E8ECF1; }
.height-row { display: flex; gap: 24rpx; align-items: flex-end; }

/* BMI */
.bmi-display { text-align: center; padding: 28rpx 0; }
.bmi-value { font-size: 96rpx; font-weight: 800; line-height: 1.1; }
.bmi-label { font-size: 26rpx; color: #7F8C8D; margin-top: 8rpx; }
.bmi-level { font-size: 30rpx; margin-top: 8rpx; font-weight: 600; }

/* Chart */
.chart-canvas { width: 100%; height: 360rpx; }

/* Summary */
.summary-row { display: flex; justify-content: space-around; text-align: center; padding-top: 12rpx; border-top: 1rpx solid #E8ECF1; }
.ws-item { display: flex; flex-direction: column; gap: 4rpx; }
.ws-label { font-size: 22rpx; color: #7F8C8D; }
.ws-val { font-size: 30rpx; color: #2C3E50; font-weight: 700; }

/* Buttons */
.btn { display: flex; align-items: center; justify-content: center; border: none; border-radius: 10rpx; font-size: 28rpx; font-weight: 600; padding: 20rpx 40rpx; }
.btn-primary { background: #4CAF80; color: #fff; }
.btn-sm { padding: 16rpx 28rpx; font-size: 26rpx; }
.btn-full { width: 100%; margin-top: 12rpx; }

/* History */
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #E8ECF1; }
.history-item:last-child { border-bottom: none; }
.hi-left { display: flex; flex-direction: column; gap: 4rpx; }
.hi-date { font-size: 24rpx; color: #7F8C8D; }
.hi-right { display: flex; align-items: center; gap: 12rpx; }
.hi-dose { font-size: 30rpx; font-weight: 600; color: #3D8B65; }
.btn-del { color: #E74C3C; font-size: 28rpx; padding: 4rpx; }
.empty-state { text-align: center; padding: 40rpx; color: #7F8C8D; font-size: 26rpx; }

/* Indicators */
.ind-item { padding: 20rpx 0; border-bottom: 1rpx solid #E8ECF1; }
.ind-item:last-child { border-bottom: none; }
.ind-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ind-date { font-size: 24rpx; color: #7F8C8D; font-weight: 600; }
.ind-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.ind-cell { background: #F5F7FA; border-radius: 8rpx; padding: 12rpx 20rpx; text-align: center; min-width: 100rpx; }
.ic-label { display: block; font-size: 20rpx; color: #7F8C8D; margin-bottom: 4rpx; }
.ic-val { font-size: 28rpx; color: #2C3E50; font-weight: 700; }

button::after { display: none; }
</style>
