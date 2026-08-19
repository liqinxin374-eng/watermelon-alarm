// RN 侧原生桥接封装：调用 Android/iOS 原生模块
import { NativeModules, NativeEventEmitter, EventSubscription } from 'react-native';
import type { Alarm } from '../engine/types';

interface NativeAlarmApi {
  schedule(alarm: AlarmPayload): Promise<void>;
  cancel(alarmId: string): Promise<void>;
}
interface AlarmPayload {
  id: string;
  triggerAt: number; // UTC ms，原生据此时区自行换算
  freq?: string;
  sound: string;
  vibrate: boolean;
  label: string;
  timezone: string;
  iosSound: string; // iOS 打包音频文件名（不含扩展名），≤30s
}

const NativeAlarm = NativeModules.AlarmModule as NativeAlarmApi;
const emitter = NativeAlarm ? new NativeEventEmitter(NativeModules.AlarmModule) : null;

export const AlarmBridge = {
  /** 向系统注册精确闹钟 */
  async schedule(alarm: Alarm): Promise<void> {
    if (!NativeAlarm) return;
    await NativeAlarm.schedule({
      id: alarm.id,
      triggerAt: alarm.nextTrigger ?? alarm.fireAt,
      freq: alarm.freq,
      sound: alarm.sound,
      vibrate: alarm.vibrate,
      label: alarm.label,
      timezone: alarm.timezone,
      iosSound: alarm.sound, // 需是打包进 iOS bundle 的音效名
    });
  },

  /** 取消闹钟 */
  async cancel(alarmId: string): Promise<void> {
    if (!NativeAlarm) return;
    await NativeAlarm.cancel(alarmId);
  },

  /** 监听系统唤醒回调（原生 → JS） */
  onFired(cb: (alarmId: string) => void): EventSubscription | null {
    if (!emitter) return null;
    return emitter.addListener('onAlarmFired', (e: { alarmId: string }) => cb(e.alarmId));
  },
};
