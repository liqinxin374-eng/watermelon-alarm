#!/usr/bin/env python3
"""
腾讯云轻量服务器 · 节假日数据全自动无人值守更新脚本
自动从开源权威源（GitHub/CDN）同步国务院最新发布的法定节假日与调休安排，并自动更新网站根目录下的 alarm/holidays.json。
"""
import json
import os
import glob
import re
import urllib.request
from datetime import datetime

# 多 CDN 镜像，保证国内云服务器高速稳定访问
CDN_TEMPLATES = [
    "https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{year}.json",
    "https://testingcf.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{year}.json",
    "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{year}.json",
]


def fetch_year_data(year: int):
    for tmpl in CDN_TEMPLATES:
        url = tmpl.format(year=year)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode("utf-8"))
        except Exception:
            continue
    return None


def get_target_dirs():
    roots = set(["/var/www/html", "/var/www/alarm-clock"])
    candidates = glob.glob("/etc/nginx/sites-enabled/*") + glob.glob("/etc/nginx/conf.d/*.conf") + ["/etc/nginx/nginx.conf"]
    for f in candidates:
        if os.path.isfile(f) and not f.endswith(".bak"):
            try:
                with open(f, "r", encoding="utf-8", errors="ignore") as fp:
                    for r in re.findall(r"root\s+([^;]+);", fp.read()):
                        roots.add(r.strip())
            except Exception:
                pass
    return [os.path.join(r, "alarm") for r in roots]


def update():
    current_year = datetime.now().year
    years_to_fetch = [current_year - 1, current_year, current_year + 1]

    all_holidays = set()
    all_makeups = set()

    for y in years_to_fetch:
        data = fetch_year_data(y)
        if not data or "days" not in data:
            continue

        print(f"[{datetime.now()}] 成功获取 {y} 年法定节假日数据")
        for item in data.get("days", []):
            d = item.get("date")
            is_off = item.get("isOffDay")
            if not d:
                continue
            if is_off is True:
                all_holidays.add(d)
            elif is_off is False:
                all_makeups.add(d)

    if not all_holidays:
        print(f"[{datetime.now()}] 未能获取有效数据，保留原有文件")
        return False

    holidays = sorted(list(all_holidays))
    makeup_workdays = sorted(list(all_makeups))

    payload = {
        "version": datetime.now().strftime("%Y.%m.%d"),
        "updatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "description": "中国法定节假日与调休补班数据（全自动更新）",
        "holidays": holidays,
        "makeupWorkdays": makeup_workdays,
    }

    target_dirs = get_target_dirs()
    for d in target_dirs:
        try:
            os.makedirs(d, exist_ok=True)
            target_file = os.path.join(d, "holidays.json")
            temp_file = target_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
            os.replace(temp_file, target_file)
            os.system(f"chmod -R 755 {d} 2>/dev/null || true")
            print(f"[{datetime.now()}] 成功更新: {target_file}")
        except Exception as e:
            print(f"[{datetime.now()}] 写入 {d} 失败: {e}")

    return True


if __name__ == "__main__":
    update()
