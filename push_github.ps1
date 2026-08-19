# UTF-8 Encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Clear-Host

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   🍉 西瓜闹钟 · 一键推送云端出包 (Android + iOS)" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示：请在下方粘贴您新建的 GitHub 仓库地址" -ForegroundColor Yellow
Write-Host "（例如：https://github.com/用户名/watermelon-alarm.git）" -ForegroundColor Gray
Write-Host ""

$repoUrl = Read-Host "请输入 GitHub 仓库地址"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host ""
    Write-Host "❌ 错误：未输入仓库地址！" -ForegroundColor Red
    Write-Host "请按任意键退出..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "[*] 正在关联远程仓库并推送代码..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 确保 Git 关联与分支设置
git remote remove origin 2>$null
git remote add origin $repoUrl.Trim()
git branch -M main

# 执行推送
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "   🎉 代码推送成功！云端自动化出包已开始运行！" -ForegroundColor Green
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "接下来只需 2 步获取安装包：" -ForegroundColor Cyan
    Write-Host "1. 在浏览器打开您的 GitHub 仓库页面"
    Write-Host "2. 点击顶部的 [ Actions ] 标签页，稍等 2~3 分钟即可直接下载编译生成的 APK 与 iOS 产物包！"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Red
    Write-Host "   ❌ 推送遇到问题，请检查网络或 GitHub 登录授权" -ForegroundColor Red
    Write-Host "===================================================" -ForegroundColor Red
    Write-Host "提示：如果是首次使用 Git，推送时弹出的 GitHub 授权窗口请点击 Authorize 确认登录。" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
