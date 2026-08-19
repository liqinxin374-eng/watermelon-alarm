// nextTrigger 单元测试（用 tsx 直接运行：npx tsx __tests__/recurrence.test.ts）
import assert from 'node:assert';
import { nextTrigger, zonedParts, wallToUtc } from '../src/engine/nextTrigger.ts';
import type { Alarm } from '../src/engine/types';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log('  ✅', name);
  } catch (e) {
    console.error('  ❌', name, '\n', (e as Error).message);
    process.exitCode = 1;
  }
}

const base: Omit<Alarm, 'freq' | 'fireAt' | 'byWeekday' | 'byMonthday' | 'byMonth' | 'interval'> = {
  id: 't', label: 't', enabled: true, sound: 'default', vibrate: false, timezone: 'Asia/Shanghai',
};

// from = 2026-01-01 00:00:00 UTC（上海时间 2026-01-01 08:00:00，周四）
const FROM = Date.UTC(2026, 0, 1, 0, 0, 0);

console.log('nextTrigger 测试（from=2026-01-01T00:00:00Z, 上海 08:00）：');

check('单次·未来 → 返回 fireAt', () => {
  const a = { ...base, freq: 'once' as const, fireAt: FROM + 100_000 };
  assert.strictEqual(nextTrigger(a, FROM), FROM + 100_000);
});

check('单次·过期 → 返回 null', () => {
  const a = { ...base, freq: 'once' as const, fireAt: FROM - 1000 };
  assert.strictEqual(nextTrigger(a, FROM), null);
});

check('按小时间隔(2h) → 未来且为 delta 整数倍', () => {
  const a = { ...base, freq: 'hour' as const, interval: 2, fireAt: FROM - 3_600_000 };
  const n = nextTrigger(a, FROM)!;
  assert.ok(n > FROM, '应在未来');
  assert.strictEqual((n - a.fireAt) % 7_200_000, 0, '须为间隔整数倍');
});

check('每天 08:30（已过当天）→ 下一个为次日 08:30(上海)', () => {
  // 锚点设为上海 2026-01-01 08:30:00；参考时间取上海 2026-01-01 09:00（已过当天 08:30）
  const fireAt = wallToUtc(2026, 1, 1, 8, 30, 0, 'Asia/Shanghai');
  const from2 = wallToUtc(2026, 1, 1, 9, 0, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'day' as const, fireAt };
  const n = nextTrigger(a, from2)!;
  const p = zonedParts(n, 'Asia/Shanghai');
  assert.deepStrictEqual([p.year, p.month, p.day, p.hour, p.minute, p.second], [2026, 1, 2, 8, 30, 0]);
});

check('每周一 → 下一个周一(2026-01-05)', () => {
  const fireAt = wallToUtc(2026, 1, 1, 9, 0, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'week' as const, byWeekday: [1], fireAt };
  const n = nextTrigger(a, FROM)!;
  const p = zonedParts(n, 'Asia/Shanghai');
  assert.strictEqual(p.year + '-' + p.month + '-' + p.day, '2026-1-5');
  const wd = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  assert.strictEqual(wd, 1);
});

check('每月 1 号 → 下一个(2026-02-01)', () => {
  const fireAt = wallToUtc(2026, 1, 1, 12, 0, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'month' as const, byMonthday: [1], fireAt };
  const n = nextTrigger(a, FROM + 20 * 86_400_000)!; // from 推到 2026-01-21
  const p = zonedParts(n, 'Asia/Shanghai');
  assert.strictEqual(p.year + '-' + p.month + '-' + p.day, '2026-2-1');
});

check('每月 15 号（非1号任意日期）→ 正确计算(2026-01-15 与 2026-02-15)', () => {
  const fireAt = wallToUtc(2026, 1, 15, 8, 0, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'month' as const, byMonthday: [15], fireAt };
  // from = 1月1日，下一次应为 1月15日
  const n1 = nextTrigger(a, FROM)!;
  const p1 = zonedParts(n1, 'Asia/Shanghai');
  assert.strictEqual(p1.year + '-' + p1.month + '-' + p1.day, '2026-1-15');
  // from = 1月20日，下一次应为 2月15日
  const n2 = nextTrigger(a, FROM + 19 * 86_400_000)!;
  const p2 = zonedParts(n2, 'Asia/Shanghai');
  assert.strictEqual(p2.year + '-' + p2.month + '-' + p2.day, '2026-2-15');
});

check('每年 1 月 1 日 → 下一个(2027-01-01)', () => {
  const fireAt = wallToUtc(2026, 1, 1, 0, 0, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'year' as const, byMonth: [1], byMonthday: [1], fireAt };
  const n = nextTrigger(a, FROM + 150 * 86_400_000)!; // from 推到 2026-06 左右
  const p = zonedParts(n, 'Asia/Shanghai');
  assert.strictEqual(p.year + '-' + p.month + '-' + p.day, '2027-1-1');
});

check('每年 5 月 20 日（非1月1日任意日期）→ 下一个(2026-05-20)', () => {
  const fireAt = wallToUtc(2026, 5, 20, 13, 14, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'year' as const, byMonth: [5], byMonthday: [20], fireAt };
  const n = nextTrigger(a, FROM)!; // from = 2026-01-01
  const p = zonedParts(n, 'Asia/Shanghai');
  assert.strictEqual(p.year + '-' + p.month + '-' + p.day, '2026-5-20');
  assert.deepStrictEqual([p.hour, p.minute, p.second], [13, 14, 0]);
});

check('时区/夏令时(纽约)冒烟 → 不崩溃且未来', () => {
  const fireAt = wallToUtc(2026, 3, 1, 7, 0, 0, 'America/New_York');
  const a = { ...base, freq: 'day' as const, fireAt, timezone: 'America/New_York' };
  const n = nextTrigger(a, FROM)!;
  assert.ok(n > FROM);
  const p = zonedParts(n, 'America/New_York');
  assert.strictEqual(p.hour, 7);
});

check('普通工作日(standard)·周五过完 → 跳过周末到下周一(2026-01-05)', () => {
  // 2026-01-02 是周五，参考时间设为周五 10:00，闹钟设为 09:00
  const fireAt = wallToUtc(2026, 1, 2, 9, 0, 0, 'Asia/Shanghai');
  const fromFriday = wallToUtc(2026, 1, 2, 10, 0, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'workday' as const, workdayMode: 'standard' as const, fireAt };
  const n = nextTrigger(a, fromFriday)!;
  const p = zonedParts(n, 'Asia/Shanghai');
  assert.strictEqual(`${p.year}-${p.month}-${p.day}`, '2026-1-5');
});

check('中国法定工作日(china)·元旦放假跳过 + 周日调休补班(2026-01-04)准时响', () => {
  // 2026-01-01(周四)至01-03(周六)为元旦放假，01-04(周日)为调休补班日
  const fireAt = wallToUtc(2026, 1, 1, 9, 0, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'workday' as const, workdayMode: 'china' as const, fireAt };
  // 参考时间为 2026-01-01 00:00，下一次触发应自动跳过 1/2/3 号假期，并在 1月4日(周日补班) 09:00 响铃
  const n = nextTrigger(a, FROM)!;
  const p = zonedParts(n, 'Asia/Shanghai');
  assert.strictEqual(`${p.year}-${p.month}-${p.day}`, '2026-1-4');
  assert.deepStrictEqual([p.hour, p.minute, p.second], [9, 0, 0]);
});

check('中国法定工作日(china)·春节调休补班(周六2026-02-14)与假期跳过', () => {
  // 锚点为 09:00，参考时间设为 2026-02-13 (周五) 10:00
  const fireAt = wallToUtc(2026, 2, 13, 9, 0, 0, 'Asia/Shanghai');
  const fromDate = wallToUtc(2026, 2, 13, 10, 0, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'workday' as const, workdayMode: 'china' as const, fireAt };
  // 下一次应是 2026-02-14(周六，春节前调休补班日)
  const n = nextTrigger(a, fromDate)!;
  const p = zonedParts(n, 'Asia/Shanghai');
  assert.strictEqual(`${p.year}-${p.month}-${p.day}`, '2026-2-14');

  // 若从 2026-02-14 10:00 开始算（春节假期 2-15 至 2-22），下一个法定工作日应是 2-23(周一)
  const fromHoliday = wallToUtc(2026, 2, 14, 10, 0, 0, 'Asia/Shanghai');
  const n2 = nextTrigger(a, fromHoliday)!;
  const p2 = zonedParts(n2, 'Asia/Shanghai');
  assert.strictEqual(`${p2.year}-${p2.month}-${p2.day}`, '2026-2-23');
});

check('周末/法定节假日模式(weekend)·节假日准时响 + 调休补班日自动跳过', () => {
  // 锚点 09:00，参考时间 2026-01-01 00:00
  const fireAt = wallToUtc(2026, 1, 1, 9, 0, 0, 'Asia/Shanghai');
  const a = { ...base, freq: 'weekend' as const, workdayMode: 'china' as const, fireAt };
  // 2026-01-01 是元旦假期，应在当天 09:00 响
  const n1 = nextTrigger(a, FROM)!;
  const p1 = zonedParts(n1, 'Asia/Shanghai');
  assert.strictEqual(`${p1.year}-${p1.month}-${p1.day}`, '2026-1-1');

  // 当 2026-01-03(周六假期) 10:00 过后，01-04(周日)是调休上班日不应响，应跳到 01-10(下周六)
  const fromJan3 = wallToUtc(2026, 1, 3, 10, 0, 0, 'Asia/Shanghai');
  const n2 = nextTrigger(a, fromJan3)!;
  const p2 = zonedParts(n2, 'Asia/Shanghai');
  assert.strictEqual(`${p2.year}-${p2.month}-${p2.day}`, '2026-1-10');
});

console.log(`\n通过 ${passed} 项测试。` + (process.exitCode ? '（存在失败）' : '（全部通过）'));
