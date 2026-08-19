import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Alarm } from '../engine/types';

export function RingScreen({ alarm, onDismiss, onSnooze }: {
  alarm: Alarm; onDismiss: () => void; onSnooze?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.bell}>🔔</Text>
      <Text style={styles.title}>{alarm.label}</Text>
      <Text style={styles.sub}>时间到！</Text>
      <TouchableOpacity style={styles.stop} onPress={onDismiss}>
        <Text style={styles.stopTxt}>停止</Text>
      </TouchableOpacity>
      {onSnooze && (
        <TouchableOpacity style={styles.snooze} onPress={onSnooze}>
          <Text style={styles.snoozeTxt}>贪睡 {alarm.snooze ?? 5} 分钟</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  bell: { fontSize: 72 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 12 },
  sub: { color: '#cbd5e1', fontSize: 16, marginTop: 6 },
  stop: { marginTop: 32, backgroundColor: '#ef4444', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30 },
  stopTxt: { color: '#fff', fontSize: 18, fontWeight: '700' },
  snooze: { marginTop: 14, borderWidth: 1, borderColor: '#94a3b8', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 30 },
  snoozeTxt: { color: '#cbd5e1', fontSize: 16 },
});
