import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { AppColors } from '../hooks/useTheme';
import type { HistoryAlert } from '../types';
import { getAlertIcon } from '../utils/alertIcon';
import { getAlertColors } from '../utils/alertColors';
import { matchesSingleCity } from '../utils/cityFilter';
import { usePreferencesContext } from '../context/PreferencesContext';

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

function getFullDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getAbsoluteTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function isRecent(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < 60 * 60 * 1000;
}

export function HistoryItem({ item }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [modalVisible, setModalVisible] = useState(false);

  const relTime = getRelativeTime(item.alertDate);
  const absTime = getAbsoluteTime(item.alertDate);
  const fullDateTime = getFullDateTime(item.alertDate);
  const recent = isRecent(item.alertDate);
  const alertIcon = getAlertIcon(item.title, item.category);
  const { primary, soft } = getAlertColors(item.title, item.category);
  const { prefs } = usePreferencesContext();
  const selectedCities = prefs.selectedCities;
  const exactMatch = prefs.exactCityMatch ?? false;

  const cities = item.data.split(',').map(s => s.trim()).filter(Boolean);

  const isMatchedCity = (city: string) =>
    selectedCities.length > 0 &&
    matchesSingleCity(city, selectedCities, exactMatch);

  return (
    <>
      <View style={styles.container}>
        {/* Icon + city info */}
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: recent ? soft : `${soft}88` }]}>
            <Text style={styles.iconText}>{alertIcon}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.cityName} numberOfLines={1}>
              {selectedCities.length > 0
                ? cities.map((city, i) => (
                    <Text
                      key={i}
                      style={isMatchedCity(city)
                        ? { color: colors.primaryDark, fontWeight: '800' }
                        : undefined}
                    >
                      {i > 0 ? ', ' : ''}{city}
                    </Text>
                  ))
                : item.data}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <View style={[styles.timeBadge, recent ? { backgroundColor: soft } : styles.timeBadgeMuted]}>
            <Text style={[styles.timeBadgeText, recent ? { color: primary } : styles.timeBadgeTextMuted]}>
              {relTime}
            </Text>
          </View>
        </View>
        {/* Divider + footer */}
        <View style={styles.divider} />
        <View style={styles.footer}>
          <Text style={styles.absTime}>{absTime}</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.6}>
            <Text style={styles.detailsLink}>פרטים נוספים ›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Details bottom-sheet modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalCategoryIcon}>{alertIcon}</Text>
              <Text style={styles.modalTitle}>{item.title}</Text>
            </View>

            {/* Date */}
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>תאריך ושעה</Text>
              <Text style={styles.modalRowValue}>{fullDateTime}</Text>
            </View>

            {/* Category */}
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>קטגוריה</Text>
              <Text style={styles.modalRowValue}>{item.category}</Text>
            </View>

            {/* Cities */}
            <View style={styles.modalCitiesSection}>
              <Text style={styles.modalRowLabel}>
                {cities.length > 1 ? `${cities.length} יישובים` : 'יישוב'}
              </Text>
              <ScrollView
                style={styles.citiesScroll}
                contentContainerStyle={styles.citiesScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {cities.map((city, i) => {
                  const matched = isMatchedCity(city);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.cityChip,
                        matched && { backgroundColor: `${colors.primaryDark}18`, borderColor: `${colors.primaryDark}50` },
                      ]}
                    >
                      <Text style={[styles.cityChipText, matched && { color: colors.primaryDark }]}>
                        {city}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseBtnText}>סגור</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    absTime: { fontSize: 11, color: c.textMuted },
    detailsLink: {
      fontSize: 11,
      color: c.primaryDark,
      fontWeight: '600',
    },
    // Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.bgLight,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 34,
      paddingTop: 12,
      maxHeight: '70%',
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
    },
    modalCategoryIcon: { fontSize: 32 },
    modalTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '800',
      color: c.textMain,
      textAlign: 'right',
    },
    modalRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    modalRowLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    modalRowValue: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textMain,
      textAlign: 'right',
      flex: 1,
      marginRight: 12,
    },
    modalCitiesSection: {
      paddingTop: 12,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      marginBottom: 20,
    },
    citiesScroll: { maxHeight: 130, marginTop: 10 },
    citiesScrollContent: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: 8,
    },
    cityChip: {
      backgroundColor: `${c.primaryDark}12`,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: `${c.primaryDark}25`,
    },
    cityChipText: {
      fontSize: 13,
      color: c.primaryDark,
      fontWeight: '600',
    },
    modalCloseBtn: {
      backgroundColor: c.primaryDark,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalCloseBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
