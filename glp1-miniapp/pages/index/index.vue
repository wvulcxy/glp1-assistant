<template>
<view class="page">
  <!-- Countdown Card -->
  <view class="card countdown-card">
    <view class="card-label">⏰ 下次注射</view>
    <view class="countdown-time">{{ countdownText }}</view>
    <view class="countdown-info">{{ countdownInfo }}</view>
    <button class="btn btn-primary btn-sm" @click="goInject">✍️ 立即记录注射</button>
  </view>

  <!-- Stats Row -->
  <view class="card stats-row">
    <view class="stat-item" v-for="s in stats" :key="s.label">
      <view class="stat-val">{{ s.value }}</view>
      <view class="stat-label">{{ s.label }}</view>
    </view>
  </view>

  <!-- Site Suggestion -->
  <view class="card">
    <view class="card-label">📍 下次注射部位建议</view>
    <view class="site-suggestion">
      <view class="site-icon">{{ injections.length > 0 ? '💉' : '🔄' }}</view>
      <view class="site-text" v-if="injections.length > 0">
        上次：<text class="bold">{{ lastSiteName }}</text>
        \n建议：<text class="bold">{{ nextSiteName }}</text>
        <text class="hint">（轮换原则）</text>
      </view>
      <view class="site-text" v-else>请先记录一次注射</view>
    </view>
  </view>

  <!-- Recent Injections -->
  <view class="card">
    <view class="card-label">📅 最近注射记录</view>
    <view v-if="recentList.length === 0" class="empty-state">暂无注射记录</view>
    <view v-for="(inj, idx) in recentList" :key="idx" class="history-item">
      <view class="hi-left">
        <view class="hi-date">{{ fmtDate(inj.date) }}</view>
        <view class="hi-detail">{{ inj.drugName || drugBrand(inj.drug) }} · {{ inj.siteName || siteName(inj.site) }}</view>
      </view>
      <view class="hi-right">
        <text class="hi-dose">{{ inj.dose }} mg</text>
        <text class="btn-del" @click="deleteInjection(inj._idx)">✕</text>
      </view>
    </view>
  </view>
</view>
</template>

<script>
import { loadData, saveData, fmtDate, fmtDateShort, getNextInjection, calcBMI, SITE_NAMES, ALL_SITES, DRUG_INFO } from '@/utils/store.js'

export default {
  data() {
    return {
      countdownText: '未设置用药计划',
      countdownInfo: '去"注射"页设置提醒吧',
      stats: [
        { label: '累计注射', value: '0' },
        { label: '本周注射', value: '0' },
        { label: '最新体重', value: '--' },
        { label: '最新腰围', value: '--' },
        { label: 'BMI', value: '--' }
      ],
      injections: [],
      recentList: [],
      lastSiteName: '',
      nextSiteName: ''
    }
  },
  onShow() { this.refresh() },
  methods: {
    fmtDate,
    fmtDateShort,
    siteName(s) { return SITE_NAMES[s] || s || '' },
    drugBrand(d) { return DRUG_INFO[d]?.brand || d || '' },

    refresh() {
      const d = loadData()
      this.injections = d.injections

      // Countdown
      const next = getNextInjection(d)
      if (next) {
        const now = new Date()
        const diff = next - now
        if (diff <= 0) {
          this.countdownText = '现在该注射了！'
          this.countdownInfo = ''
        } else {
          const days = Math.floor(diff / 86400000)
          const hours = Math.floor((diff % 86400000) / 3600000)
          const mins = Math.floor((diff % 3600000) / 60000)
          this.countdownText = days > 0 ? `${days}天 ${hours}小时` : hours > 0 ? `${hours}小时 ${mins}分钟` : `${mins}分钟`
          const parts = []
          if (d.reminder.drugName || (d.reminder.drug && DRUG_INFO[d.reminder.drug]?.brand)) {
            parts.push('💊 ' + (d.reminder.drugName || DRUG_INFO[d.reminder.drug]?.brand))
          }
          if (d.reminder.dose) parts.push('📏 ' + d.reminder.dose + ' mg')
          parts.push('📅 ' + fmtDate(next.toISOString()) + ' ' + d.reminder.time)
          this.countdownInfo = parts.join('  ')
        }
      } else {
        this.countdownText = '未设置用药计划'
        this.countdownInfo = '去"注射"页设置提醒吧'
      }

      // Stats
      this.stats[0].value = String(d.injections.length)
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      this.stats[1].value = String(d.injections.filter(i => new Date(i.date) >= weekStart).length)

      if (d.weights.length > 0) {
        this.stats[2].value = d.weights[d.weights.length - 1].weight + ' kg'
      } else {
        this.stats[2].value = '--'
      }

      if (d.waists.length > 0) {
        this.stats[3].value = d.waists[d.waists.length - 1].waist + ' cm'
      } else {
        this.stats[3].value = '--'
      }

      if (d.height && d.weights.length > 0) {
        const bmi = calcBMI(d.weights[d.weights.length - 1].weight, d.height)
        this.stats[4].value = bmi ? bmi.toFixed(1) : '--'
      } else {
        this.stats[4].value = '--'
      }

      // Site suggestion
      if (d.injections.length > 0) {
        const lastSite = d.injections[d.injections.length - 1].site
        const lastIdx = ALL_SITES.indexOf(lastSite)
        const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % ALL_SITES.length : 0
        this.lastSiteName = SITE_NAMES[lastSite] || lastSite
        this.nextSiteName = SITE_NAMES[ALL_SITES[nextIdx]]
      }

      // Recent injections
      const recent = [...d.injections].reverse().slice(0, 5)
      this.recentList = recent.map(i => {
        const origIdx = d.injections.indexOf(i)
        return { ...i, _idx: origIdx }
      })
    },

    goInject() {
      uni.switchTab({ url: '/pages/inject/inject' })
    },

    async deleteInjection(idx) {
      const res = await uni.showModal({
        title: '确认删除',
        content: '确定删除这条注射记录吗？',
        confirmColor: '#E74C3C'
      })
      if (!res.confirm) return
      const d = loadData()
      d.injections.splice(idx, 1)
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

/* Countdown */
.countdown-card { background: linear-gradient(135deg, #4CAF80, #66BB8E); color: #fff; text-align: center; padding: 40rpx 28rpx; }
.countdown-card .card-label { color: rgba(255,255,255,0.9); }
.countdown-time { font-size: 64rpx; font-weight: 700; margin: 12rpx 0; }
.countdown-info { font-size: 26rpx; opacity: 0.85; margin-bottom: 28rpx; }
.countdown-card .btn { background: rgba(255,255,255,0.25); color: #fff; }

/* Stats */
.stats-row { display: flex; text-align: center; padding: 20rpx 8rpx; }
.stats-row .stat-item { flex: 1; }
.stat-val { font-size: 32rpx; font-weight: 700; color: #3D8B65; }
.stat-label { font-size: 22rpx; color: #7F8C8D; margin-top: 4rpx; }

/* Site Suggestion */
.site-suggestion { display: flex; align-items: center; gap: 24rpx; padding: 16rpx 0; }
.site-icon { font-size: 64rpx; }
.site-text { font-size: 28rpx; line-height: 1.6; }
.site-text .bold { font-weight: 600; color: #2C3E50; }
.site-text .hint { font-size: 22rpx; color: #7F8C8D; }

/* Buttons */
.btn { display: flex; align-items: center; justify-content: center; border: none; border-radius: 10rpx; font-size: 28rpx; font-weight: 600; padding: 20rpx 40rpx; }
.btn-primary { background: #4CAF80; color: #fff; }
.btn-sm { padding: 16rpx 28rpx; font-size: 26rpx; }

/* History */
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #E8ECF1; }
.history-item:last-child { border-bottom: none; }
.hi-left { display: flex; flex-direction: column; gap: 4rpx; }
.hi-date { font-size: 24rpx; color: #7F8C8D; }
.hi-detail { font-size: 28rpx; font-weight: 500; }
.hi-right { display: flex; align-items: center; gap: 12rpx; }
.hi-dose { font-size: 30rpx; font-weight: 600; color: #3D8B65; }
.btn-del { color: #E74C3C; font-size: 28rpx; padding: 4rpx; }
.empty-state { text-align: center; padding: 40rpx; color: #7F8C8D; font-size: 26rpx; }

button::after { display: none; }
</style>
