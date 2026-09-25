<template>
<scroll-view class="page" scroll-y>
  <!-- Drug Cards -->
  <view class="drug-card" v-for="(info, key) in DRUG_INFO" :key="key">
    <view class="drug-name">{{ info.name }}</view>
    <view class="drug-generic">{{ info.brand }} · {{ info.generic }}</view>
    <view class="drug-info">
      <text class="drug-tag">{{ info.type }}</text>
      <text class="drug-tag">{{ info.freq }}</text>
      <text class="drug-tag">{{ info.doseRange }}</text>
    </view>
    <view class="drug-desc">{{ info.desc }}</view>
  </view>

  <!-- About -->
  <view class="card about-card">
    <view class="card-label">ℹ️ 关于 GLP-1 用药助手</view>
    <view class="about-info">
      <view class="about-row"><text class="ar-label">版本</text><text class="ar-val">v1.4</text></view>
      <view class="about-row"><text class="ar-label">作者</text><text class="ar-val">wxy</text></view>
      <view class="about-row"><text class="ar-label">联系</text><text class="ar-val">wvulcxy@users.noreply.github.com</text></view>
    </view>
    <view class="about-desc">GLP-1 用药助手是一款面向 GLP-1 受体激动剂使用者的单机版用药管理工具，帮助追踪注射记录、体重腰围变化和健康指标。</view>
    <view class="about-disclaimer">⚠️ 免责声明：本应用仅供参考，不构成医疗建议。用药请遵医嘱。</view>
  </view>

  <!-- CSV Export -->
  <button class="btn btn-primary btn-full" @click="doExport" style="margin-top:24rpx;">📤 导出数据 (CSV)</button>
</scroll-view>
</template>

<script>
import { DRUG_INFO, loadData, exportCSV } from '@/utils/store.js'

export default {
  data() {
    return { DRUG_INFO }
  },
  methods: {
    async doExport() {
      const d = loadData()
      const csv = exportCSV(d)
      // WeChat mini program: use file system + share
      const fs = uni.getFileSystemManager()
      const path = `${wx.env.USER_DATA_PATH}/glp1_export.csv`
      fs.writeFile({
        filePath: path,
        data: csv,
        encoding: 'utf8',
        success: () => {
          uni.shareFileMessage({
            filePath: path,
            fileName: 'GLP1_用药数据.csv',
            success: () => {},
            fail: () => {
              // Fallback: save to clipboard
              uni.setClipboardData({ data: csv, success: () => {
                uni.showToast({ title: '已复制到剪贴板，可粘贴到记事本', icon: 'none', duration: 3000 })
              }})
            }
          })
        },
        fail: () => {
          uni.showToast({ title: '导出失败', icon: 'none' })
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 20rpx 20rpx 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06); }
.card-label { font-size: 26rpx; font-weight: 600; color: #2C3E50; margin-bottom: 20rpx; }

/* Drug Cards */
.drug-card { background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.06); border-left: 8rpx solid #4CAF80; }
.drug-name { font-size: 30rpx; font-weight: 700; color: #2C3E50; margin-bottom: 6rpx; }
.drug-generic { font-size: 24rpx; color: #4CAF80; margin-bottom: 12rpx; }
.drug-info { display: flex; flex-wrap: wrap; gap: 10rpx; }
.drug-tag { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx; background: #E8F5EC; color: #3D8B65; }
.drug-desc { font-size: 24rpx; color: #7F8C8D; margin-top: 12rpx; line-height: 1.5; }

/* About */
.about-info { display: flex; flex-direction: column; gap: 12rpx; margin-bottom: 24rpx; }
.about-row { display: flex; justify-content: space-between; padding: 12rpx 24rpx; background: #F5F7FA; border-radius: 8rpx; font-size: 26rpx; }
.ar-label { color: #7F8C8D; }
.ar-val { color: #2C3E50; font-weight: 600; }
.about-desc { font-size: 24rpx; color: #7F8C8D; line-height: 1.6; margin-bottom: 16rpx; }
.about-disclaimer { font-size: 22rpx; color: #F39C12; line-height: 1.5; }

/* Button */
.btn { display: flex; align-items: center; justify-content: center; border: none; border-radius: 10rpx; font-size: 28rpx; font-weight: 600; padding: 20rpx 40rpx; }
.btn-primary { background: #4CAF80; color: #fff; }
.btn-full { width: 100%; }

button::after { display: none; }
</style>
