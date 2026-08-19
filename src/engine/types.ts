// 闹钟数据模型 —— 与框架文档 §3 一致
// 所有时间戳内部以 UTC(ms) 存储；展示/计算时按 alarm.timezone 转换。

export type Frequency =
  | 'once' // 单次：仅 fireAt
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | 'workday' // 工作日
  | 'weekend'; // 周末/节假日

export type WorkdayMode =
  | 'china' // 中国法定工作日（智能跳过法定节假日，包含周末调休补班）
  | 'standard'; // 普通工作日（标准周一至周五）

export interface Alarm {
  id: string;
  label: string;
  enabled: boolean;
  fireAt: number; // 首次触发时间戳(ms, UTC)，作为锚点
  freq: Frequency;
  workdayMode?: WorkdayMode; // freq 为 workday / weekend 时生效，默认 'china'
  interval?: number; // second/minute/hour 时的间隔倍数 (>=1)
  byWeekday?: number[]; // 0-6（周日=0），freq='week' 生效
  byMonthday?: number[]; // 1-31，freq='month' 生效
  byMonth?: number[]; // 1-12，freq='year' 生效
  sound: string; // 铃声资源标识
  vibrate: boolean;
  snooze?: number; // 贪睡分钟，0=不贪睡
  nextTrigger?: number; // 缓存的下次触发时间(ms)，引擎维护
  timezone: string; // IANA，如 'Asia/Shanghai'
}
