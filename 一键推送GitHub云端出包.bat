@echo off
chcp 65001 >nul
title 🍉 西瓜闹钟 · 一键推送GitHub云端出包
cls
echo ===================================================
echo   🍉 西瓜闹钟 · 一键推送云端出包 (Android + iOS)
echo ===================================================
echo.
echo 提示：请在下方粘贴您新建的 GitHub 仓库地址
echo 例如：https://github.com/xxx/watermelon-alarm.git
echo.
set /p REPO_URL=请输入 GitHub 仓库地址: 

if "%REPO_URL%"=="" (
    echo.
    echo ❌ 错误：未输入仓库地址！
    echo.
    pause
    exit /b
)

echo.
echo [*] 正在关联远程仓库并推送代码...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ===================================================
    echo   🎉 代码推送成功！云端自动化出包已开始运行！
    echo ===================================================
    echo.
    echo 接下来您只需：
    echo 1. 打开您的 GitHub 仓库网页；
    echo 2. 点击顶部的 [ Actions ] 页面；
    echo 3. 稍等 2~3 分钟，即可直接下载生成的 APK 与 iOS 安装包！
    echo.
) else (
    echo ===================================================
    echo   ❌ 推送遇到问题，请检查网络或 GitHub 登录授权
    echo ===================================================
)

echo.
pause
