import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import type { Alarm } from '../engine/types';
import { alarmStore } from '../storage/alarmStore';
import { scheduler } from '../engine/scheduler';

function freqText(a: Alarm): string {
  if (a.freq === 'workday') {
    return a.workdayMode === 'standard' ? '工作日(周一至五)' : '法定工作日(智能调休)';
  }
  if (a.freq === 'weekend') {
    return a.workdayMode === 'standard' ? '周末(周六日)' : '法定节假日/周末';
  }
  const map: Record<string, string> = {
    once: '单次',
    second: `每${a.interval ?? 1}秒`,
    minute: `每${a.interval ?? 1}分`,
    hour: `每${a.interval ?? 1}时`,
    day: '每天',
    week: '每周',
    month: '每月',
    year: '每年',
  };
  return map[a.freq] ?? a.freq;
}

export function AlarmList({ onEdit }: { onEdit: (a: Alarm | null) => void }) {
  const [list, setList] = useState<Alarm[]>([]);
  const refresh = () => alarmStore.list().then(setList);
  useEffect(() => { refresh(); }, []);

  return (
    <View style={styles.wrap}>
      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => onEdit(item)}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.sub}>{freqText(item)} · {item.timezone}</Text>
            </TouchableOpacity>
            <Switch
              value={item.enabled}
              onValueChange={(v) => scheduler.setEnabled(item.id, v).then(refresh)}
            />
          </View>
        )}
      />
      <TouchableOpacity style={styles.addBtn} onPress={() => onEdit(null)}>
        <Text style={styles.addTxt}>+ 新建闹钟</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  label: { fontSize: 18, fontWeight: '600' },
  sub: { fontSize: 13, color: '#888', marginTop: 2 },
  addBtn: { marginTop: 16, backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center' },
  addTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
