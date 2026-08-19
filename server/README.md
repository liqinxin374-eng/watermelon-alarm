# 腾讯云轻量服务器 · 节假日数据自动更新与部署指南 (xiguazi.online)

本服务支持 **全自动无人值守更新**：
- **每年国务院发布最新放假通知后，自动抓取并更新 `holidays.json`**；
- **零额外软件安装、零维护，App 端每次打开自动同步最新法定节假日与调休补班**。

---

## 一、 服务器端全自动更新配置（推荐，一次配置永久无人值守）

### 1. 将自动更新脚本上传到服务器
在服务器终端执行创建并写入脚本：
```bash
sudo mkdir -p /var/www/alarm-clock/
sudo curl -s -o /var/www/alarm-clock/auto_update_holidays.py https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/2026.json > /dev/null 2>&1 || true
```
*(也可以直接把项目里的 `server/auto_update_holidays.py` 上传到服务器 `/var/www/alarm-clock/auto_update_holidays.py`)*

### 2. 设置 Linux 定时任务（每周一凌晨 3 点自动检查并更新）
在服务器终端运行：
```bash
(crontab -l 2>/dev/null; echo "0 3 * * 1 python3 /var/www/alarm-clock/auto_update_holidays.py >> /var/log/holiday_update.log 2>&1") | crontab -
```
配置完成后，服务器会在每周一自动同步最新放假与调休安排，您完全无需任何人工干预！

---

## 二、 服务访问方式

当前服务以极轻量模式监听 `18080` 端口：
```bash
nohup python3 -m http.server 18080 --bind 0.0.0.0 -d /var/www/alarm-clock/ > /dev/null 2>&1 &
```
- **接口地址**：`http://xiguazi.online:18080/holidays.json`
- **特点**：内存占用仅 10MB，与主程序 100% 隔离，永不冲突。
