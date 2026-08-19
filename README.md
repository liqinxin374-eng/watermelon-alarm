# 西瓜闹钟 🍉 · Watermelon Alarm

React Native (bare) + TypeScript 实现的跨平台高可用定时闹钟，支持**中国法定工作日智能调休**与**年/月/日/时/分/秒**全周期，到点触发**手机本地铃声**，覆盖 **Android + iOS**，支持腾讯云静默热更新。

## 关键结论（详见 `deliverables/software-company/alarm-clock/framework.md`）
- **Android**：`AlarmManager.setAlarmClock` + 前台 Service + `MediaPlayer` 播放自定义铃声，**可做到 App 被杀也可靠响铃**。
- **iOS（方案1）**：`UNUserNotificationCenter` 本地通知，**铃声须打包进 Bundle、≤30s、不可循环超 30s；App 被手动杀死后不响**。如需更强能力需申请 Critical Alert entitlement。

## 目录结构
```
src/engine/       周期模型 + nextTrigger（纯函数，已单测通过）
src/storage/      持久化（AsyncStorage）
src/native/       RN 桥接封装
src/ui/           列表 / 编辑器 / 响铃页
android/.../alarm/  Kotlin 原生模块（Module/Receiver/Service/RingActivity）
ios/AlarmBridge/    Swift 原生模块（AlarmModule/AlarmScheduler）
__tests__/        nextTrigger 单元测试（tsx 运行）
```

## 运行核心引擎测试（无需原生环境）
```bash
npm install
npm test        # 运行 nextTrigger 单测（8 项全通过）
npm run typecheck
```

## 构建原生 App
1. `npx react-native init` 同级工程或在此工程补 `index.js` / `metro.config.js` / `app.json`（已提供）；
2. **生成铃声资源**：`python3 scripts/gen-ringtone.py` 产出
   - `android/app/src/main/res/raw/alarm_sound.wav`（代码引用 `R.raw.alarm_sound`）
   - `ios/AlarmBridge/default.wav`（iOS 默认通知音，须 ≤30s 且打入 Bundle）
3. **Android 注册**：
   - 在 `AndroidManifest.xml` 按 `android/app/src/main/AndroidManifest.xml.example` 注册 `AlarmReceiver`/`AlarmService`/`AlarmRingActivity` 与权限；
   - 在 `MainApplication` 的 `getPackages()` 中加入 `new AlarmPackage()`（见 `MainApplication.kt.example`）；
   - 引导用户加入电池优化白名单（`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`）。
4. **iOS 注册**：
   - 将 `ios/AlarmBridge/` 下 `AlarmModule.swift`、`AlarmScheduler.swift`、`AlarmBridge.m`、`AlarmBridge-Bridging-Header.h`、`default.wav` 加入 Xcode 工程（同 target）；
   - Build Settings 设 `SWIFT_OBJC_BRIDGING_HEADER = AlarmBridge/AlarmBridge-Bridging-Header.h`；
   - 在 `AppDelegate` 设置 `UNUserNotificationCenter.current().delegate = self`；
   - Signing & Capabilities 开启 **Notifications**；铃声文件 Target Membership 勾选 App（打包进 Bundle）。
   - ⚠️ 方案1 限制：App 被手动杀死后不响；铃声 ≤30s。

## 构建与打包（出安装包）

> ⚠️ **环境前提**：当前工程是"源码级"，尚未 `react-native init` 出完整原生骨架；且 **iOS 必须在 macOS/Xcode 上编译**（Windows 无法产出 .ipa）。下面两条路任选其一。

### 路线 A：云端构建（推荐，无需自有 Mac，Windows 即可触发双端）
1. 先补出完整原生工程（任选其一）：
   - 本地：`npx react-native init AlarmClock --version 0.74.5` 后把我方 `src/`、`App.tsx`、`android/.../java`、`ios/AlarmBridge/` 合并进去；或
   - 直接走 Expo 云 prebuild：`npx expo prebuild`（需把工程转 Expo 或 EAS 兼容）。
2. 登录 Expo：`npm i -g eas-cli && eas login`（需 Expo 账号）。
3. 出包：`eas build -p android --profile production` 与 `eas build -p ios --profile production`。
   - Android 产物 `.aab`（已配 `eas.json`）；iOS 产物 `.ipa`（在云端 Mac 编译）。
4. CI 一键双端：已提供 `.github/workflows/build.yml`（配 `EXPO_TOKEN` Secret 后 push tag 自动出双端）。

### 路线 B：本机原生打包
- **Android**（需本机 Android SDK + Java）：
  1. `python3 scripts/gen-ringtone.py` 生成铃声；
  2. `android\generate-keystore.bat` 生成签名（或 `keytool` 自建）；
  3. 在 `android/gradle.properties` 填 `MYAPP_RELEASE_STORE_FILE/STORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD`；
  4. `cd android && gradlew assembleRelease` → `app/build/outputs/apk/release/app-release.apk`（或 `bundleRelease` 出 `.aab`）。
  5. ⚠️ 你的 `ANDROID_HOME` 路径含空格（`E:\C盘瘦身搬家文件路径\Android\Sdk`），`local.properties` 的 `sdk.dir` 需转短路径（如 `E:\C盘~1\Android\Sdk`，用 `cmd /c for %I in ("%ANDROID_HOME%") do @echo %~sI` 获取），否则 Gradle 易报错。
- **iOS**（必须在 macOS + Xcode）：
  1. `cd ios && pod install`；
  2. Xcode 打开 `AlarmClock.xcworkspace` → 选设备/Any iOS → Product ▸ Archive → 导出 `.ipa`；或用 `fastlane ios build`（已提供 `fastlane/Fastfile`）。

## 周期数据模型速览
```ts
interface Alarm {
  id: string; fireAt: number; freq: 'once'|'second'|'minute'|'hour'|'day'|'week'|'month'|'year'|'workday'|'weekend';
  workdayMode?: 'china'|'standard'; interval?: number; byWeekday?: number[]; byMonthday?: number[]; byMonth?: number[];
  sound: string; vibrate: boolean; timezone: string; nextTrigger?: number;
}
```
`nextTrigger(alarm, from)` 为纯函数，统一计算下次触发时间（UTC ms），已覆盖时区与夏令时。
