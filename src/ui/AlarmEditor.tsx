import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, ScrollView } from 'react-native';
import type { Alarm, Frequency } from '../engine/types';
import { zonedParts, wallToUtc } from '../engine/nextTrigger';
import { scheduler } from '../engine/scheduler';

const FREQ_OPTIONS: { key: Frequency; label: string }[] = [
  { key: 'once', label: '单次' },
  { key: 'workday', label: '工作日' },
  { key: 'weekend', label: '周末/节假日' },
  { key: 'day', label: '每天' },
  { key: 'week', label: '每周' },
  { key: 'month', label: '每月' },
  { key: 'year', label: '每年' },
  { key: 'hour', label: '按时' },
  { key: 'minute', label: '按分' },
  { key: 'second', label: '按秒' },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function AlarmEditor({ alarm, onDone }: { alarm: Alarm | null; onDone: () => void }) {
  const initialTimezone = alarm?.timezone ?? 'Asia/Shanghai';
  const initialParts = alarm ? zonedParts(alarm.fireAt, initialTimezone) : zonedParts(Date.now(), initialTimezone);

  const [label, setLabel] = useState(alarm?.label ?? '我的闹钟');
  const [freq, setFreq] = useState<Frequency>(alarm?.freq ?? 'workday');
  const [workdayMode, setWorkdayMode] = useState<WorkdayMode>(alarm?.workdayMode ?? 'china');
  const [interval, setInterval] = useState(String(alarm?.interval ?? 1));
  const [sound, setSound] = useState(alarm?.sound ?? 'default');
  const [vibrate, setVibrate] = useState(alarm?.vibrate ?? true);
  const [timezone, setTimezone] = useState(initialTimezone);

  // 时分秒
  const [hour, setHour] = useState(String(initialParts.hour).padStart(2, '0'));
  const [minute, setMinute] = useState(String(initialParts.minute).padStart(2, '0'));

  // 扩展周期字段
  const [byWeekday, setByWeekday] = useState<number[]>(alarm?.byWeekday ?? [1, 2, 3, 4, 5]);
  const [monthDay, setMonthDay] = useState(String(alarm?.byMonthday?.[0] ?? initialParts.day));
  const [yearMonth, setYearMonth] = useState(String(alarm?.byMonth?.[0] ?? initialParts.month));

  const toggleWeekday = (day: number) => {
    if (byWeekday.includes(day)) {
      setByWeekday(byWeekday.filter((d) => d !== day));
    } else {
      setByWeekday([...byWeekday, day].sort());
    }
  };

  const save = async () => {
    const h = Math.min(23, Math.max(0, parseInt(hour, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(minute, 10) || 0));
    const d = Math.min(31, Math.max(1, parseInt(monthDay, 10) || 1));
    const mo = Math.min(12, Math.max(1, parseInt(yearMonth, 10) || 1));
    const nowParts = zonedParts(Date.now(), timezone);

    let fireAt: number;
    if (freq === 'year') {
      fireAt = wallToUtc(nowParts.year, mo, d, h, m, 0, timezone);
    } else if (freq === 'month') {
      fireAt = wallToUtc(nowParts.year, nowParts.month, d, h, m, 0, timezone);
    } else {
      fireAt = wallToUtc(nowParts.year, nowParts.month, nowParts.day, h, m, 0, timezone);
    }

    await scheduler.upsert({
      id: alarm?.id,
      label: label.trim() || '闹钟',
      freq,
      workdayMode: freq === 'workday' || freq === 'weekend' ? workdayMode : undefined,
      interval: freq === 'second' || freq === 'minute' || freq === 'hour' ? Math.max(1, parseInt(interval, 10) || 1) : undefined,
      byWeekday: freq === 'week' ? byWeekday : undefined,
      byMonthday: freq === 'month' || freq === 'year' ? [d] : undefined,
      byMonth: freq === 'year' ? [mo] : undefined,
      fireAt,
      sound,
      vibrate,
      timezone,
      enabled: true,
    });
    onDone();
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.h}>{alarm ? '编辑闹钟' : '新建闹钟'}</Text>

      <Text style={styles.k}>标签</Text>
      <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="闹钟名称" />

      <Text style={styles.k}>触发时间（24小时制）</Text>
      <View style={styles.timeRow}>
        <TextInput
          style={[styles.input, styles.timeInput]}
          value={hour}
          onChangeText={setHour}
          keyboardType="numeric"
          maxLength={2}
          placeholder="时"
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          style={[styles.input, styles.timeInput]}
          value={minute}
          onChangeText={setMinute}
          keyboardType="numeric"
          maxLength={2}
          placeholder="分"
        />
      </View>

      <Text style={styles.k}>重复周期</Text>
      <View style={styles.chipGrid}>
        {FREQ_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, freq === opt.key && styles.chipActive]}
            onPress={() => setFreq(opt.key)}
          >
            <Text style={[styles.chipText, freq === opt.key && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(freq === 'workday' || freq === 'weekend') && (
        <View style={styles.section}>
          <Text style={styles.k}>工作日/假期模式</Text>
          <View style={styles.modeCol}>
            <TouchableOpacity
              style={[styles.modeBtn, workdayMode === 'china' && styles.modeBtnActive]}
              onPress={() => setWorkdayMode('china')}
            >
              <Text style={[styles.modeBtnTitle, workdayMode === 'china' && styles.modeBtnTitleActive]}>
                🇨🇳 中国法定调休（推荐）
              </Text>
              <Text style={[styles.modeBtnSub, workdayMode === 'china' && styles.modeBtnSubActive]}>
                {freq === 'workday' ? '节假日自动跳过 · 周末调休补班准时响铃' : '法定节假日放假及周末准时响铃'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, workdayMode === 'standard' && styles.modeBtnActive]}
              onPress={() => setWorkdayMode('standard')}
            >
              <Text style={[styles.modeBtnTitle, workdayMode === 'standard' && styles.modeBtnTitleActive]}>
                📅 普通周一至周五
              </Text>
              <Text style={[styles.modeBtnSub, workdayMode === 'standard' && styles.modeBtnSubActive]}>
                {freq === 'workday' ? '仅固定每周一至周五响铃，不随节假日调整' : '仅固定每周六与周日响铃'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {freq === 'week' && (
        <View style={styles.section}>
          <Text style={styles.k}>选择重复星期</Text>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((name, idx) => {
              const active = byWeekday.includes(idx);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.weekBtn, active && styles.weekBtnActive]}
                  onPress={() => toggleWeekday(idx)}
                >
                  <Text style={[styles.weekBtnText, active && styles.weekBtnTextActive]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {freq === 'month' && (
        <View style={styles.section}>
          <Text style={styles.k}>每月第几天 (1-31)</Text>
          <TextInput
            style={styles.input}
            value={monthDay}
            onChangeText={setMonthDay}
            keyboardType="numeric"
            placeholder="如 15"
          />
        </View>
      )}

      {freq === 'year' && (
        <View style={styles.section}>
          <Text style={styles.k}>每年月份与日期</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={yearMonth}
              onChangeText={setYearMonth}
              keyboardType="numeric"
              placeholder="月份 (1-12)"
            />
            <Text style={{ marginHorizontal: 8, alignSelf: 'center' }}>月</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={monthDay}
              onChangeText={setMonthDay}
              keyboardType="numeric"
              placeholder="日期 (1-31)"
            />
            <Text style={{ marginLeft: 8, alignSelf: 'center' }}>日</Text>
          </View>
        </View>
      )}

      {(freq === 'second' || freq === 'minute' || freq === 'hour') && (
        <View style={styles.section}>
          <Text style={styles.k}>间隔倍数</Text>
          <TextInput style={styles.input} value={interval} onChangeText={setInterval} keyboardType="numeric" />
        </View>
      )}

      <Text style={styles.k}>铃声资源</Text>
      <TextInput style={styles.input} value={sound} onChangeText={setSound} placeholder="默认 default" />

      <Text style={styles.k}>时区 (IANA)</Text>
      <TextInput style={styles.input} value={timezone} onChangeText={setTimezone} />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>振动提示</Text>
        <Switch value={vibrate} onValueChange={setVibrate} />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveBtnText}>保存闹钟</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={onDone}>
        <Text style={styles.cancelBtnText}>取消</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  h: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
  k: { marginTop: 14, fontSize: 14, fontWeight: '600', color: '#475569' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  timeInput: { width: 70, textAlign: 'center', fontSize: 20, fontWeight: '600' },
  colon: { fontSize: 24, fontWeight: '700', marginHorizontal: 8, color: '#334155' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 14, color: '#334155' },
  chipTextActive: { color: '#ffffff', fontWeight: '600' },
  section: { marginTop: 4 },
  modeCol: { marginTop: 8, gap: 8 },
  modeBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  modeBtnActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  modeBtnTitle: { fontSize: 15, fontWeight: '600', color: '#334155' },
  modeBtnTitleActive: { color: '#2563eb' },
  modeBtnSub: { fontSize: 12, color: '#64748b', marginTop: 3 },
  modeBtnSubActive: { color: '#3b82f6' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  weekBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBtnActive: { backgroundColor: '#2563eb' },
  weekBtnText: { fontSize: 14, color: '#334155' },
  weekBtnTextActive: { color: '#ffffff', fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#334155' },
  saveBtn: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    marginTop: 10,
    padding: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#64748b', fontSize: 15 },
});
