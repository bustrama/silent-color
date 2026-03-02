import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { AppColors } from '../hooks/useTheme';
import type { HistoryAlert } from '../types';

interface Props {
  item: HistoryAlert;
}

function getRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'עכשיו';
  if (diffMin < 60) return `לפני ${diffMin} דק'`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `לפני ${diffHr} שע'`;
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

function getAbsoluteTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function isRecent(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < 60 * 60 * 1000; // within 1 hour
}

export function HistoryItem({ item }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const relTime = getRelativeTime(item.alertDate);
  const absTime = getAbsoluteTime(item.alertDate);
  const recent = isRecent(item.alertDate);

  return (
    <View style={styles.container}>
      {/* Icon + city info */}
      <View style={styles.row}>
        <View style={[styles.iconWrap, recent ? styles.iconWrapActive : styles.iconWrapMuted]}>
          <Text style={styles.iconText}>{recent ? '🔔' : '📍'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.cityName} numberOfLines={1}>
            {item.data}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <View style={[styles.timeBadge, recent ? styles.timeBadgeActive : styles.timeBadgeMuted]}>
          <Text style={[styles.timeBadgeText, recent ? styles.timeBadgeTextActive : styles.timeBadgeTextMuted]}>
            {relTime}
          </Text>
        </View>
      </View>
      {/* Divider + absolute time */}
      <View style={styles.divider} />
      <View style={styles.footer}>
        <Text style={styles.absTime}>{absTime}</Text>
        <Text style={styles.detailsLink}>פרטים נוספים</Text>
      </View>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.surfaceLight,
      borderRadius: 16,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    row: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    iconWrapActive: { backgroundColor: c.mutedTealSoft },
    iconWrapMuted: { backgroundColor: `${c.border}80` },
    iconText: { fontSize: 18 },
    info: { flex: 1, alignItems: 'flex-end', gap: 2 },
    cityName: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textMain,
      textAlign: 'right',
    },
    title: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'right',
    },
    timeBadge: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      flexShrink: 0,
    },
    timeBadgeActive: { backgroundColor: c.mutedTealSoft },
    timeBadgeMuted: { backgroundColor: `${c.border}80` },
    timeBadgeText: { fontSize: 11, fontWeight: '700' },
    timeBadgeTextActive: { color: c.mutedTeal },
    timeBadgeTextMuted: { color: c.textMuted },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginBottom: 8,
    },
    footer: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    absTime: {
      fontSize: 11,
      color: c.textMuted,
    },
    detailsLink: {
      fontSize: 11,
      color: `${c.mutedTeal}CC`,
      fontWeight: '500',
    },
  });
}
