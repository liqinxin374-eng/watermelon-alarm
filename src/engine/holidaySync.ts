// 节假日与工作日数据云端同步模块
// 支持：后台静默同步 + 本地持久化缓存 + 离线安全兜底

import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerCustomHolidays } from './holidays';

const CACHE_KEY = 'alarm:holiday_cache';

// 腾讯云轻量服务器 HTTPS 标准接口
export const DEFAULT_CLOUD_URL = 'https://www.xiguazi.online/alarm/holidays.json';

export interface HolidayPayload {
  version?: string;
  updatedAt?: string;
  holidays: string[];
  makeupWorkdays: string[];
}

/**
 * 1. 优先读取本地持久化缓存（离线首屏加速）
 */
export async function loadCachedHolidays(): Promise<HolidayPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: HolidayPayload = JSON.parse(raw);
    if (Array.isArray(data.holidays) && Array.isArray(data.makeupWorkdays)) {
      registerCustomHolidays(data.holidays, data.makeupWorkdays);
      return data;
    }
  } catch (err) {
    // 缓存读取异常时静默忽略，依赖内置离线数据
  }
  return null;
}

/**
 * 2. 后台异步从腾讯云拉取最新节假日与调休补班数据
 * @param cloudUrl 腾讯云接口地址
 * @param timeoutMs 超时时间（默认 5000ms）
 */
export async function syncHolidaysFromCloud(
  cloudUrl: string = DEFAULT_CLOUD_URL,
  timeoutMs: number = 5000
): Promise<boolean> {
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    const res = await fetch(cloudUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    });

    if (timer) clearTimeout(timer);

    if (!res.ok) {
      return false;
    }

    const data: HolidayPayload = await res.json();
    if (Array.isArray(data.holidays) && Array.isArray(data.makeupWorkdays)) {
      // 注册到运行时核心引擎
      registerCustomHolidays(data.holidays, data.makeupWorkdays);
      // 持久化到本地缓存
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      return true;
    }
  } catch (err) {
    // 网络错误或超时静默忽略，绝不阻塞用户界面与闹钟响铃
  }
  return false;
}

/**
 * 3. 启动初始化：先装载本地缓存，再后台静默请求云端增量更新
 */
export async function initHolidaySync(cloudUrl: string = DEFAULT_CLOUD_URL): Promise<void> {
  // 先读本地缓存
  await loadCachedHolidays();
  // 异步发起云端请求（不 await 阻塞主流程）
  syncHolidaysFromCloud(cloudUrl).catch(() => {});
}
