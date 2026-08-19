# 跨平台定时闹钟 · 交付概览

**TL;DR**：按"软件开发团队"SOP，先产出框架/架构设计，再全量实现双端源码；核心周期引擎 `nextTrigger` 已用 Node 实跑 **8/8 测试通过**（含时区与夏令时）。

## 交付状态
- 框架/架构文档：✅ `deliverables/software-company/alarm-clock/framework.md`
- 全量源码：✅ `alarm-clock-app/`（RN+TS 共享逻辑 + Android Kotlin + iOS Swift 原生模块）
- 核心引擎单测：✅ 8 项全部通过
- 工程胶水层（上轮新增）：✅ `index.js` / `app.json` / `metro.config.js` / `react-native.config.js` / Android `AlarmPackage.java`+`MainApplication.kt.example` / iOS `AlarmBridge.m`+`AlarmBridge-Bridging-Header.h` / 铃声生成脚本 `scripts/gen-ringtone.py`
- **构建/打包配置（本轮新增）**：✅ `eas.json`（云端双端）、`android/generate-keystore.bat`（签名）、`fastlane/Fastfile`（双端 lane）、`.github/workflows/build.yml`（CI 一键双端）、README「构建与打包」章节
- **真机安装包（.ipa/.apk）**：⛔ 无法在本沙箱产出。原因：当前为 **Windows** 无 macOS/Xcode → iOS 无法编译；工程仍是源码级、未 `react-native init` 出完整原生骨架，且 Android 打包需脚手架+签名。已配置 EAS 云端构建（iOS 在云端 Mac 出包）作为唯一免 Mac 路径。

## 技术决策（已与用户确认）
- 技术栈：React Native (bare) + TypeScript
- iOS 策略：方案1（≤30s 打包铃声，App 被杀后不响——最稳可上架）
- 范围：全量双端实现

## 文件清单
- `deliverables/software-company/alarm-clock/framework.md` — 框架/架构设计
- `alarm-clock-app/src/engine/types.ts` — 闹钟数据模型
- `alarm-clock-app/src/engine/nextTrigger.ts` — 周期计算引擎（纯函数，零依赖）
- `alarm-clock-app/src/engine/scheduler.ts` — 调度编排
- `alarm-clock-app/src/storage/alarmStore.ts` — 持久化
- `alarm-clock-app/src/native/AlarmBridge.ts` — RN 桥接封装
- `alarm-clock-app/src/ui/*.tsx` — 列表/编辑器/响铃页
- `alarm-clock-app/App.tsx` — 入口
- `alarm-clock-app/android/.../alarm/*.kt` — Android 原生模块（Module/Receiver/Service/RingActivity）
- `alarm-clock-app/android/.../AndroidManifest.xml.example` — 清单声明示例
- `alarm-clock-app/ios/AlarmBridge/*.swift` — iOS 原生模块（AlarmModule/AlarmScheduler）
- `alarm-clock-app/ios/AlarmBridge/AlarmBridge.m` + `AlarmBridge-Bridging-Header.h` — iOS 桥接/链接
- `alarm-clock-app/__tests__/recurrence.test.ts` — 引擎单测
- `alarm-clock-app/index.js` / `app.json` / `metro.config.js` / `react-native.config.js` — RN 工程入口与配置（本轮新增）
- `alarm-clock-app/android/.../alarm/AlarmPackage.java` + `MainApplication.kt.example` — Android 模块注册（本轮新增）
- `alarm-clock-app/scripts/gen-ringtone.py` — 本地生成占位铃声（本轮新增）
- `alarm-clock-app/package.json` / `tsconfig.json` / `README.md`

## 用户下一步（出包）
- **iOS**：本沙箱（Windows）无法编译，必须 macOS/Xcode 或走 EAS 云端（`eas build -p ios`）。
- **Android**：本沙箱有 SDK 但工程未脚手架化；可在你本机按 README「路线 B」出 APK/AAB，或走 EAS 云端（`eas build -p android`）。
- 已备齐 `eas.json` / `fastlane/Fastfile` / `.github/workflows/build.yml` / `generate-keystore.bat`，任选路线即可一键出双端。
- 若你提供 Expo 账号/Token，我可在此发起 EAS 云端构建（iOS 在云端 Mac 出 .ipa、Android 出 .aab）；若你愿意，我也可在此尝试 `react-native init` + 编译 Android 调试 APK（耗时较长且受 SDK 路径含空格影响，可能失败）。
