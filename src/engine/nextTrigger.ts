// 周期性闹钟核心引擎（纯函数，零运行时依赖，可单测）
// 时区与时令(DST)处理基于 Intl，无需第三方库。

import type { Alarm, Frequency } from './types';
import { isWorkday, isWeekendOrHoliday } from './holidays.ts';

interface WallParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function getFmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    fmtCache.set(tz, f);
  }
  return f;
}

/** 给定 UTC(ms) 与 IANA 时区，返回该时区下的"墙上时间"各分量 */
export function zonedParts(utcMs: number, tz: string): WallParts {
  const parts = getFmt(tz).formatToParts(new Date(utcMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // 某些环境午夜表示为 24
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
  };
}

/** 给定时区下的墙上时间，反算 UTC(ms)（迭代处理 DST，2-3 次收敛） */
export function wallToUtc(
  y: number,
  m: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  tz: string,
): number {
  const target = Date.UTC(y, m - 1, d, h, mi, s);
  let utc = target;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(utc, tz);
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    utc = utc + (target - wall);
  }
  return utc;
}

const STEP_MS: Partial<Record<Frequency, number>> = {
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
};

function addDays(y: number, m: number, d: number, n: number): WallParts {
  const dt = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000);
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  };
}

/**
 * 计算下一次触发时间(ms, UTC)。
 * @param alarm 闹钟定义
 * @param from  参考时间(ms, UTC)，通常传 Date.now()
 * @returns 下次触发时间戳；若单次且已过期则返回 null
 */
export function nextTrigger(alarm: Alarm, from: number): number | null {
  const tz = alarm.timezone;

  if (alarm.freq === 'once') {
    return alarm.fireAt > from ? alarm.fireAt : null;
  }

  // 固定间隔类（秒/分/时）
  const step = STEP_MS[alarm.freq];
  if (step) {
    const interval = Math.max(1, Math.floor(alarm.interval ?? 1));
    const delta = step * interval;
    if (alarm.fireAt > from) return alarm.fireAt;
    const elapsed = from - alarm.fireAt;
    const next = alarm.fireAt + Math.ceil(elapsed / delta) * delta;
    return next > from ? next : next + delta;
  }

  // 日历类：从锚点时间取出 时:分:秒
  const anchor = zonedParts(alarm.fireAt, tz);
  const H = anchor.hour;
  const M = anchor.minute;
  const S = anchor.second;

  const matches = (y: number, m: number, d: number): boolean => {
    if (alarm.freq === 'workday') {
      return isWorkday(y, m, d, alarm.workdayMode ?? 'china');
    }
    if (alarm.freq === 'weekend') {
      return isWeekendOrHoliday(y, m, d, alarm.workdayMode ?? 'china');
    }
    if (alarm.freq === 'week') {
      const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      return (alarm.byWeekday ?? []).includes(wd);
    }
    if (alarm.freq === 'month') {
      return (alarm.byMonthday ?? []).includes(d);
    }
    if (alarm.freq === 'year') {
      const monthOk = (alarm.byMonth ?? []).includes(m);
      const dayOk = (alarm.byMonthday ?? []).includes(d);
      return monthOk && dayOk;
    }
    return true; // day
  };

  // 从 from 所在墙日期开始按步长推进
  const start = zonedParts(from, tz);
  let cursor = { year: start.year, month: start.month, day: start.day, hour: 0, minute: 0, second: 0 };
  const maxIter = 5000;

  for (let i = 0; i < maxIter; i++) {
    if (matches(cursor.year, cursor.month, cursor.day)) {
      const cand = wallToUtc(cursor.year, cursor.month, cursor.day, H, M, S, tz);
      if (cand > from) return cand;
    }
    // 步进：日历类（day / week / month / year）按天递增遍历
    cursor = addDays(cursor.year, cursor.month, cursor.day, 1);
  }
  return null;
}
