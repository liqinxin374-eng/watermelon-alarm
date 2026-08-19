@echo off
REM 生成 Android 发布签名 keystore（请替换为自己的别名/密码）
REM 注意：ANDROID_HOME 路径含空格，Gradle 需短路径，见 README "构建与打包"。
set KEYSTORE=alarmclock-release.keystore
set ALIAS=alarmclock
echo 正在生成 %KEYSTORE% ...
keytool -genkeypair -v -keystore %KEYSTORE% -alias %ALIAS% ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -dname "CN=AlarmClock, OU=Dev, O=AlarmClock, L=Shanghai, S=Shanghai, C=CN"
echo 完成。请将 keystore 放到 android/app/ 并在 gradle.properties 配置签名属性。
pause
