import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native';
import type { Alarm } from './src/engine/types';
import { AlarmList } from './src/ui/AlarmList';
import { AlarmEditor } from './src/ui/AlarmEditor';
import { RingScreen } from './src/ui/RingScreen';
import { AlarmBridge } from './src/native/AlarmBridge';
import { scheduler } from './src/engine/scheduler';
import { alarmStore } from './src/storage/alarmStore';
import { initHolidaySync } from './src/engine/holidaySync';

type Screen = { name: 'list' } | { name: 'editor'; alarm: Alarm | null } | { name: 'ring'; alarm: Alarm };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'list' });
  const [ringing, setRinging] = useState<Alarm | null>(null);

  useEffect(() => {
    initHolidaySync(); // 静默同步云端最新节假日数据
    scheduler.resyncAll(); // 启动时重注册所有闹钟
    const sub = AlarmBridge.onFired(async (id) => {
      const a = await scheduler.handleFired(id);
      if (a) setRinging(a);
    });
    return () => sub?.remove();
  }, []);

  if (ringing) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <RingScreen
          alarm={ringing}
          onDismiss={() => setRinging(null)}
          onSnooze={() => setRinging(null)}
        />
      </SafeAreaView>
    );
  }

  if (screen.name === 'editor') {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <AlarmEditor alarm={screen.alarm} onDone={() => setScreen({ name: 'list' })} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AlarmList onEdit={(a) => setScreen({ name: 'editor', alarm: a })} />
    </SafeAreaView>
  );
}

// 供原生模块回查闹钟详情（如 Android Service 直接拉起响铃页）
export async function getAlarmForFiring(id: string): Promise<Alarm | null> {
  return alarmStore.get(id);
}
