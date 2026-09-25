# GLP-1 用药助手 · iOS 版

## 项目结构

```
glp1-ios/
├── Sources/                    # Swift 源码
│   ├── GLP1App.swift           # App 入口
│   ├── ContentView.swift       # 主视图
│   ├── WebViewWrapper.swift    # WKWebView 封装 + JS 桥接
│   └── NotificationManager.swift  # 原生通知管理
├── Resources/
│   ├── Info.plist              # 应用配置
│   ├── PrivacyInfo.xcprivacy   # 隐私清单（App Store 必需）
│   └── LaunchScreen.storyboard # 启动屏
├── Assets/                     # PWA 静态文件（来自 glp1-assistant）
│   ├── index.html / app.js / styles.css / sw.js / manifest.json
│   ├── icons/
│   └── Assets.xcassets/        # App 图标
└── project.yml                 # XcodeGen 项目描述
```

## 快速开始

### 前提

- macOS + Xcode 15+
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`

### 步骤

```bash
# 1. 编辑 project.yml，填入你的 Apple Developer Team ID
#    DEVELOPMENT_TEAM: "你的TeamID"

# 2. 生成 .xcodeproj
cd glp1-ios
xcodegen generate

# 3. 用 Xcode 打开
open GLP1.xcodeproj

# 4. 选好签名证书 → Archive → 发布
```

## 关键实现细节

### localStorage 持久化
`WebViewWrapper.swift` 第14行：`config.websiteDataStore = .default()`

**必须用 `.default()`**，不能用 `nonPersistent()`，否则 App 重启后注射记录/体重数据全部丢失。

### 通知机制
- 前端 (`app.js`) 检测到 iOS WKWebView 时，通过 `window.webkit.messageHandlers.notification.postMessage()` 桥接到原生层
- 原生层用 `UNUserNotificationCenter` 发送本地通知，支持 App 在前后台时都弹通知
- 首次发版可跳过通知（系统会提示用户授权，通过即可）

### 隐私清单 (PrivacyInfo.xcprivacy)
声明了 `UserDefaults` API（WKWebView localStorage 底层使用），理由是 `CA92.1`（访问用户自己的应用数据）。不声明会被拒审。

## 版本

- 当前版本：v1.3（同步 glp1-assistant）
- iOS 最低：17.0
- 仅支持竖屏
