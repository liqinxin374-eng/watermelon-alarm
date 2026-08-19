@echo off
chcp 65001 >nul
echo ===================================================
echo   🍉 西瓜闹钟 · 一键推送云端出包 (Android + iOS)
echo ===================================================
echo.
echo 提示：您只需要在 GitHub 上新建一个空仓库（Public 或 Private 均可）。
echo.
set /p REPO_URL=请输入您的 GitHub 仓库地址 (如 https://github.com/xxx/watermelon-alarm.git): 

if "%REPO_URL%"=="" (
    echo 错误：未输入仓库地址！
    pause
    exit /b
)

echo.
echo [*] 正在关联远程仓库并推送代码...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo   🎉 推送成功！云端流水线已自动触发！
    echo ===================================================
    echo.
    echo 接下来您只需：
    echo 1. 打开您的 GitHub 仓库页面；
    echo 2. 点击顶部的 [ Actions ] 标签页；
    echo 3. 稍等 2~3 分钟，即可直接下载编译生成的：
    echo    - 🤖 Android APK 安装包
    echo    - 🍏 iOS 原生编译产物包
    echo.
) else (
    echo.
    echo ===================================================
    echo   ❌ 推送失败，请检查网络或 GitHub 授权
    echo ===================================================
)

echo.
pause
