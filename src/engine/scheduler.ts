// 调度编排层：闹钟生命周期 + 与原生桥接协同
import type { Alarm } from './types';
import { nextTrigger } from './nextTrigger';
import { alarmStore } from '../storage/alarmStore';
import { AlarmBridge } from '../native/AlarmBridge';

function genId(): string {
  return 'al_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const scheduler = {
  /** 新增/更新闹钟：计算下次触发并向系统注册 */
  async upsert(input: Omit<Alarm, 'id' | 'nextTrigger'> & Partial<Pick<Alarm, 'id'>>): Promise<Alarm> {
    const alarm: Alarm = {
      id: input.id ?? genId(),
      ...input,
    } as Alarm;
    alarm.nextTrigger = nextTrigger(alarm, Date.now());
    await alarmStore.save(alarm);
    if (alarm.enabled && alarm.nextTrigger) {
      await AlarmBridge.schedule(alarm);
    } else {
      await AlarmBridge.cancel(alarm.id);
    }
    return alarm;
  },

  /** 删除闹钟：取消系统注册 + 删除存储 */
  async remove(id: string): Promise<void> {
    await AlarmBridge.cancel(id);
    await alarmStore.remove(id);
  },

  /** 启用/停用 */
  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const a = await alarmStore.get(id);
    if (!a) return;
    a.enabled = enabled;
    if (enabled) {
      await this.upsert(a);
    } else {
      await alarmStore.save(a);
      await AlarmBridge.cancel(id);
    }
  },

  /** 系统唤醒回调：返回需响铃的闹钟，并自动排下下一次 */
  async handleFired(id: string): Promise<Alarm | null> {
    const a = await alarmStore.get(id);
    if (!a || !a.enabled) return null;
    const now = Date.now();
    a.nextTrigger = nextTrigger(a, now);
    await alarmStore.save(a);
    if (a.nextTrigger) await AlarmBridge.schedule(a); // 排下一次
    return a;
  },

  /** App 启动：扫描并重注册所有启用的闹钟（防进程被杀丢失） */
  async resyncAll(): Promise<void> {
    const all = await alarmStore.list();
    const now = Date.now();
    for (const a of all) {
      if (!a.enabled) continue;
      a.nextTrigger = nextTrigger(a, now);
      await alarmStore.save(a);
      if (a.nextTrigger) await AlarmBridge.schedule(a);
    }
  },
};
