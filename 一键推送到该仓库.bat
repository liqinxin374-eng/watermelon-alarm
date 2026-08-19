@echo off
chcp 65001 >nul
title 🍉 西瓜闹钟 · 正在推送到 GitHub 云端仓库
cls
echo ===================================================
echo   🍉 西瓜闹钟 · 正在推送到您的专属 GitHub 仓库
echo   目标仓库: liqinxin374-eng / watermelon-alarm
echo ===================================================
echo.
echo [*] 正在将代码与云端出包配置推送到 GitHub...
echo (如果弹出 GitHub 登录/授权窗口，请在浏览器中点击确认即可)
echo.

git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ===================================================
    echo   🎉 推送成功！GitHub 云端自动化出包已开始运行！
    echo ===================================================
    echo.
    echo 请直接在浏览器打开您的 Actions 页面查看出包进度：
    echo 👉 https://github.com/liqinxin374-eng/watermelon-alarm/actions
    echo.
    echo 稍等 2~3 分钟，即可直接下载编译生成的：
    echo - 🤖 Android APK 安装包
    echo - 🍏 iOS 原生编译产物包
    echo.
) else (
    echo ===================================================
    echo   ❌ 推送遇到问题，请检查网络或 GitHub 登录授权
    echo ===================================================
)

echo.
pause
