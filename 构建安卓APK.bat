@echo off
chcp 65001 >nul
echo ========================================
echo   🍉 西瓜闹钟 · Android APK 自动打包脚本
echo ========================================
echo.

cd /d "%~dp0\android"
echo 正在编译生成 APK 安装包，请稍候...
echo.

call gradlew.bat assembleDebug

if exist "app\build\outputs\apk\debug\app-debug.apk" (
    copy /Y "app\build\outputs\apk\debug\app-debug.apk" "%~dp0\西瓜闹钟_v1.0.0.apk" >nul
    echo.
    echo ========================================
    echo   🎉 APK 打包成功！
    echo ========================================
    echo 安装包路径：
    echo %~dp0\西瓜闹钟_v1.0.0.apk
    echo.
    echo 已为您复制到项目根目录，可直接发送到安卓手机安装！
) else (
    echo.
    echo ========================================
    echo   ❌ 打包失败，请检查上方日志
    echo ========================================
)

echo.
pause
