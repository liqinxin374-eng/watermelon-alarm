// 闹钟持久化层（封装存储实现，默认 AsyncStorage）
import type { Alarm } from '../engine/types';

// 若使用 MMKV，可替换此实现；保持接口不变即可。
import AsyncStorage from '@react-native-async-storage/async-storage';

const INDEX_KEY = 'alarm:index';
const itemKey = (id: string) => `alarm:${id}`;

export interface AlarmRepository {
  list(): Promise<Alarm[]>;
  get(id: string): Promise<Alarm | null>;
  save(alarm: Alarm): Promise<void>;
  remove(id: string): Promise<void>;
}

export const alarmStore: AlarmRepository = {
  async list() {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const items = await Promise.all(ids.map((id) => this.get(id)));
    return items.filter((x): x is Alarm => x !== null);
  },
  async get(id) {
    const raw = await AsyncStorage.getItem(itemKey(id));
    return raw ? (JSON.parse(raw) as Alarm) : null;
  },
  async save(alarm) {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(alarm.id)) {
      ids.push(alarm.id);
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
    }
    await AsyncStorage.setItem(itemKey(alarm.id), JSON.stringify(alarm));
  },
  async remove(id) {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids.filter((x) => x !== id)));
    await AsyncStorage.removeItem(itemKey(id));
  },
};
