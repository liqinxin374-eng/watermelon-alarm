#!/usr/bin/env python3
"""生成占位铃声资源（3 秒 600Hz 蜂鸣，带淡入淡出）。
本地运行：
    python3 scripts/gen-ringtone.py
产出：
    android/app/src/main/res/raw/alarm_sound.wav   (Android, R.raw.alarm_sound)
    ios/AlarmBridge/default.wav                      (iOS, 默认通知音)
如需自定义铃声，用你自己的音频替换这两个文件即可（iOS 须 ≤30s 且打入 Bundle）。
"""
import wave
import struct
import math
import os

SR = 44100
DUR = 3.0
FREQ = 600.0

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = [
    os.path.join(ROOT, "android/app/src/main/res/raw/alarm_sound.wav"),
    os.path.join(ROOT, "ios/AlarmBridge/default.wav"),
]


def render(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    frames = int(SR * DUR)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        for i in range(frames):
            t = i / SR
            env = min(1.0, t * 5.0) * min(1.0, (DUR - t) * 5.0)
            s = 0.6 * math.sin(2 * math.pi * FREQ * t) * env
            w.writeframes(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32767)))
    print("written", path, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    for p in OUT:
        render(p)
