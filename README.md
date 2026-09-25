# GLP-1 用药助手

> 面向 GLP-1 受体激动剂使用者的本地化用药管理工具，多端支持（Web / Android / iOS / 微信小程序）。

GLP-1 用药助手帮助你追踪注射记录、管理用药提醒、记录体重腰围与健康指标，并提供注射部位轮换指导。所有数据保存在本地设备，**无需登录、无需后端、离线可用**。

## 📲 如何使用

微信小程序端已上线，产品名为 **GLPoke**——打开微信，搜索「GLPoke」即可直接使用，无需安装。

## ✨ 功能特性

- 🏠 **首页仪表盘** — 下次注射倒计时、累计/本周注射次数、最新体重与腰围、BMI 摘要
- 💉 **注射管理** — 用药频率与提醒时间设置、10 个注射部位可视化轮换建议、手动记录与历史（支持单条删除）
- 🧬 **健康追踪** — 身高 + BMI 自动分级、体重/腰围趋势折线图、血脂四项与脂肪肝指标记录
- 📋 **副作用日志** — 9 种常见症状多选、严重程度分级、历史回溯
- 💊 **药品信息库** — 内置 GLP-1 药物（司美格鲁肽、利拉鲁肽、度拉糖肽、替尔泊肽等）剂型与剂量参考
- 🔔 **用药提醒** — Web 端 Notification / Android 原生 AlarmManager / iOS 原生桥接通知
- 📤 **数据导出** — 一键导出注射/体重/腰围/副作用/健康指标为 CSV（UTF-8 BOM，Excel 直接打开不乱码）

## 📁 项目结构

```
glp1-assistant/          # Monorepo（本仓库）
├── glp1-assistant/      # Web PWA 核心（原生 HTML/CSS/JS + localStorage）
├── glp1-android/        # Android WebView 封装（Kotlin）
├── glp1-ios/            # iOS WKWebView 封装（Swift + XcodeGen）
└── glp1-miniapp/        # 微信小程序（uni-app + Vue 3）
```

## 🚀 快速开始

### Web（glp1-assistant）

```bash
cd glp1-assistant
npx serve .            # 或任意静态服务器
```

> 通知、Service Worker 等需通过 `http://localhost` 访问；直接双击 `index.html` 打开时部分功能不可用。

### Android（glp1-android）

1. 用 Android Studio 打开 `glp1-android` 目录，首次打开会自动配置 Gradle 与 SDK
2. `MainActivity.kt` 为 WebView 入口，`ReminderScheduler.kt` 负责原生用药提醒

### iOS（glp1-ios）

```bash
brew install xcodegen
cd glp1-ios
# 编辑 project.yml，填入你的 Apple Developer Team ID（DEVELOPMENT_TEAM）
xcodegen generate
open "GLP-1用药助手.xcodeproj"
```

> 最低 iOS 17.0，仅支持竖屏。

### 微信小程序（glp1-miniapp）

1. 用 HBuilderX 导入 `glp1-miniapp`
2. 运行到微信开发者工具；发布前在 `manifest.json` 的 `mp-weixin.appid` 填入你的小程序 AppID

## 🛠 技术栈

| 端 | 技术 |
|----|------|
| Web | HTML5 · CSS3 · 原生 JavaScript (ES6) · localStorage · PWA (Service Worker) |
| Android | Kotlin · WebView · AlarmManager |
| iOS | Swift · WKWebView · UserNotifications · XcodeGen |
| 小程序 | uni-app · Vue 3 |

## 🔒 数据与隐私

- 全部数据存储于设备本地（localStorage），**无后端、无账号、无云端同步**
- 应用不采集、不上传任何个人数据
- 数据可随时通过「数据导出 CSV」备份到本地

## ⚠️ 免责声明

本工具仅用于**个人用药记录与管理**，不提供任何医疗建议，不构成诊断或治疗依据。药品剂量、用药频率请严格遵医嘱，使用前请咨询专业医师或药师。

## 📌 版本

- Web / Android / iOS：v1.3
- 微信小程序：v1.4

## 📄 许可证

Copyright © 2026 wvulcxy。保留所有权利，详见 [LICENSE](LICENSE)。

## 👤 作者

wxy · [wvulcxy@users.noreply.github.com](mailto:wvulcxy@users.noreply.github.com)
