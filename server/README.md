# 腾讯云轻量服务器 · 节假日数据自动更新与安全部署指南 (xiguazi.online)

本服务支持 **全自动无人值守更新与安全内网部署**：
- **每年国务院发布最新放假通知后，自动抓取并更新 `holidays.json`**；
- **零额外软件安装、零维护，App 端每次打开自动同步最新法定节假日与调休补班**；
- **安全性加固**：服务端口从原易受告警的 `18080` 切换至安全端口 `28080`，且严格限制仅监听本地回环 `127.0.0.1`，云防火墙无须开放多余高危端口。

---

## 一、 云端访问方式（与「第一桶金」Nginx 统一集成）

云端标准对外接口由「第一桶金」项目的 Nginx 统一反向代理提供：
- **标准接口地址**：`https://www.xiguazi.online/alarm/holidays.json`
- **Nginx 反向代理配置**（见 `第一桶金/mahjong.conf`）：
  ```nginx
  # 定时闹钟节假日云端反向代理
  location ^~ /alarm/ {
      proxy_pass http://127.0.0.1:28080/;
      proxy_set_header Host $host;
      add_header Access-Control-Allow-Origin *;
  }
  ```
- **特点**：统一走 443 (HTTPS) 加密通道，零公网高危端口暴露，防扫描防攻击，已完全解决云服务商端口风险警报。

---

## 二、 服务端守护进程配置 (Systemd)

在服务器端通过 Systemd 常驻运行并守护：

### 1. 服务文件 `/etc/systemd/system/alarm-holidays.service`
```ini
[Unit]
Description=Alarm Clock Holidays JSON Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/alarm-clock
ExecStart=/usr/bin/python3 -m http.server 28080 --bind 127.0.0.1 -d /var/www/alarm-clock/
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 2. 常用管理命令
```bash
# 启动 / 重启服务
systemctl restart alarm-holidays

# 查看运行状态
systemctl status alarm-holidays

# 开机自启
systemctl enable alarm-holidays
```

---

## 三、 节假日数据自动更新配置（每周自动检查）

### 1. 自动更新脚本
位于服务器 `/var/www/alarm-clock/auto_update_holidays.py`。

### 2. 设置 Linux 定时任务（每周一凌晨 3 点自动检查并更新）
在服务器终端运行：
```bash
(crontab -l 2>/dev/null; echo "0 3 * * 1 python3 /var/www/alarm-clock/auto_update_holidays.py >> /var/log/holiday_update.log 2>&1") | crontab -
```
配置完成后，服务器会在每周一自动同步最新放假与调休安排，完全无需任何人工干预！
