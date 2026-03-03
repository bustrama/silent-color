import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useCities } from '../../src/hooks/useCities';
import { usePreferencesContext } from '../../src/context/PreferencesContext';
import { CityRow } from '../../src/components/CityRow';
import { useTheme } from '../../src/hooks/useTheme';
import type { AppColors } from '../../src/hooks/useTheme';
import type { SoundSetting } from '../../src/types';
import { playAlertSound } from '../../src/services/notificationService';

const SOUND_OPTIONS: { label: string; value: SoundSetting; icon: string }[] = [
  { label: 'צליל התראה', value: 'sound', icon: '🔔' },
  { label: 'רטט בלבד', value: 'vibrate', icon: '📳' },
  { label: 'שקט', value: 'silent', icon: '🔕' },
];

export default function SettingsScreen() {
  const { cities, loading: citiesLoading } = useCities();
  const {
    prefs,
    toggleCity,
    selectAllCities,
    clearCities,
    setSoundSetting,
    setCustomSound,
    setExactCityMatch,
  } = usePreferencesContext();

  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');
  const customInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.trim().toLowerCase();
    return cities.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.areaname?.toLowerCase().includes(q) ?? false)
    );
  }, [cities, search]);

  const selectedCount = prefs.selectedCities.length;
  const allLabels = cities.map((c) => c.label);

  const handleAddCustom = useCallback(() => {
    const name = customInput.trim();
    if (!name) return;
    if (!prefs.selectedCities.includes(name)) {
      toggleCity(name);
    }
    setCustomInput('');
    customInputRef.current?.blur();
  }, [customInput, prefs.selectedCities, toggleCity]);

  const handleTestSound = useCallback(async () => {
    await playAlertSound('sound', prefs.customSoundUri);
  }, [prefs.customSoundUri]);

  const handlePickSound = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const { uri, name } = result.assets[0];
        setCustomSound(uri, name ?? 'צליל מותאם');
      }
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את בוחר הקבצים');
    }
  }, [setCustomSound]);

  const handleResetSound = useCallback(() => {
    setCustomSound(null, null);
  }, [setCustomSound]);

  const soundFileName = prefs.customSoundName ?? 'alert.wav (ברירת מחדל)';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>בחירת אזורי ניטור</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!search && (
        <>
          {/* 1. Sound settings */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>קול התראה</Text>
            <View style={styles.soundRow}>
              {SOUND_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.soundChip,
                    prefs.soundSetting === opt.value && styles.soundChipActive,
                  ]}
                  onPress={() => setSoundSetting(opt.value)}
                >
                  <Text style={styles.soundChipIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.soundChipLabel,
                      prefs.soundSetting === opt.value && styles.soundChipLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Expanded sound controls — only when sound mode is selected */}
            {prefs.soundSetting === 'sound' && (
              <View style={styles.soundExpanded}>
                <View style={styles.soundFileRow}>
                  <Text style={styles.soundFileIcon}>🎵</Text>
                  <Text style={styles.soundFileName} numberOfLines={1}>
                    {soundFileName}
                  </Text>
                  {prefs.customSoundUri && (
                    <TouchableOpacity onPress={handleResetSound} style={styles.soundResetBtn}>
                      <Text style={styles.soundResetText}>איפוס</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.soundActionRow}>
                  <TouchableOpacity
                    style={styles.soundActionBtn}
                    onPress={handleTestSound}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.soundActionIcon}>🔊</Text>
                    <Text style={styles.soundActionLabel}>בדוק צליל</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.soundActionBtn, styles.soundActionBtnPrimary]}
                    onPress={handlePickSound}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.soundActionIcon}>📁</Text>
                    <Text style={[styles.soundActionLabel, styles.soundActionLabelPrimary]}>
                      בחר מהמכשיר
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* 2. Selected city badges */}
          {selectedCount > 0 && (
            <View style={styles.badgesSection}>
              <Text style={styles.badgesSectionLabel}>
                {selectedCount} ישובים נבחרו
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesScroll}
              >
                {prefs.selectedCities.map((cityLabel) => (
                  <TouchableOpacity
                    key={cityLabel}
                    style={styles.badge}
                    onPress={() => toggleCity(cityLabel)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.badgeText}>{cityLabel}</Text>
                    <Text style={styles.badgeX}>✕</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 3. Filter settings — exact match toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>הגדרות סינון</Text>
            <View style={styles.exactMatchRow}>
              <Switch
                value={prefs.exactCityMatch ?? false}
                onValueChange={setExactCityMatch}
                trackColor={{ false: colors.border, true: `${colors.primaryDark}80` }}
                thumbColor={prefs.exactCityMatch ? colors.primaryDark : colors.textMuted}
              />
              <View style={styles.exactMatchTexts}>
                <Text style={styles.exactMatchTitle}>התאמה מדויקת</Text>
                <Text style={styles.exactMatchDesc}>
                  {prefs.exactCityMatch
                    ? 'מציג רק התרעות שהישוב שלהם תואם בדיוק'
                    : 'מציג גם התרעות עם שמות דומים'}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. Custom city input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>הוסף ישוב ידנית</Text>
            <View style={styles.customRow}>
              <TouchableOpacity
                style={[
                  styles.addBtn,
                  !customInput.trim() && styles.addBtnDisabled,
                ]}
                onPress={handleAddCustom}
                disabled={!customInput.trim()}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.addBtnText,
                  !customInput.trim() && styles.addBtnTextDisabled,
                ]}>
                  + הוסף
                </Text>
              </TouchableOpacity>
              <TextInput
                ref={customInputRef}
                style={styles.customTextInput}
                placeholder="שם ישוב שלא ברשימה..."
                placeholderTextColor={colors.textMuted}
                value={customInput}
                onChangeText={setCustomInput}
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={handleAddCustom}
              />
            </View>
          </View>
        </>
      )}

      <FlatList
        data={filteredCities}
        keyExtractor={(item) => item.label}
        renderItem={({ item }) => (
          <CityRow
            city={item}
            selected={prefs.selectedCities.includes(item.label)}
            onToggle={toggleCity}
          />
        )}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* 5. Search — sits right above the city list */}
            <View style={styles.searchWrap}>
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="חיפוש עיר או יישוב..."
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  textAlign="right"
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearch('')}
                    style={styles.searchClearBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.searchClearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* City list header — RTL: title+clear on right, select-all on left */}
            <View style={styles.cityListHeader}>
              {/* Right side: section title + clear button */}
              <View style={styles.cityListTitleRow}>
                <Text style={styles.cityListLabel}>כל היישובים</Text>
                {selectedCount > 0 && (
                  <TouchableOpacity onPress={clearCities}>
                    <Text style={styles.clearBtn}>נקה ({selectedCount})</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Left side: select all */}
              <TouchableOpacity onPress={() => selectAllCities(allLabels)}>
                <Text style={styles.selectAllBtn}>בחר הכל</Text>
              </TouchableOpacity>
            </View>

            {citiesLoading && (
              <ActivityIndicator
                color={colors.primaryDark}
                style={styles.loader}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          !citiesLoading ? (
            <Text style={styles.emptyText}>לא נמצאו ערים</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bgLight },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.bgLight,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: c.textMain,
    },
    headerSpacer: { width: 36 },
    // Selected badges
    badgesSection: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    badgesSectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
      textAlign: 'right',
      marginBottom: 8,
    },
    badgesScroll: {
      flexDirection: 'row-reverse',
      gap: 6,
      paddingBottom: 4,
    },
    badge: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: `${c.primaryDark}18`,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
      borderWidth: 1,
      borderColor: `${c.primaryDark}30`,
    },
    badgeText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.primaryDark,
    },
    badgeX: {
      fontSize: 11,
      color: c.primaryDark,
      fontWeight: '700',
    },
    searchWrap: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
    searchBar: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: c.surfaceLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, color: c.textMain, fontSize: 15 },
    searchClearBtn: {
      paddingLeft: 8,
    },
    searchClearText: {
      fontSize: 14,
      color: c.textMuted,
      fontWeight: '600',
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
      textAlign: 'right',
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // Custom city input
    customRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    customTextInput: {
      flex: 1,
      color: c.textMain,
      fontSize: 14,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    addBtn: {
      backgroundColor: c.primaryDark,
      paddingHorizontal: 16,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnDisabled: {
      backgroundColor: `${c.primaryDark}40`,
    },
    addBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
    addBtnTextDisabled: {
      color: 'rgba(255,255,255,0.5)',
    },
    soundRow: {
      flexDirection: 'row-reverse',
      gap: 8,
    },
    soundChip: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceLight,
      gap: 4,
    },
    soundChipActive: {
      borderColor: c.primaryDark,
      backgroundColor: `${c.primary}15`,
    },
    soundChipIcon: { fontSize: 20 },
    soundChipLabel: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '500',
      textAlign: 'center',
    },
    soundChipLabelActive: { color: c.primaryDark, fontWeight: '700' },
    // Expanded sound controls
    soundExpanded: {
      marginTop: 12,
      backgroundColor: c.surfaceLight,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: 'hidden',
    },
    soundFileRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    soundFileIcon: { fontSize: 14 },
    soundFileName: {
      flex: 1,
      fontSize: 13,
      color: c.textMain,
      textAlign: 'right',
      fontWeight: '500',
    },
    soundResetBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: `${c.alertOrange}15`,
    },
    soundResetText: {
      fontSize: 11,
      color: c.alertOrangeDark,
      fontWeight: '600',
    },
    soundActionRow: {
      flexDirection: 'row-reverse',
      gap: 0,
    },
    soundActionBtn: {
      flex: 1,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.border,
    },
    soundActionBtnPrimary: {
      backgroundColor: `${c.primaryDark}10`,
      borderRightWidth: 0,
    },
    soundActionIcon: { fontSize: 16 },
    soundActionLabel: {
      fontSize: 13,
      color: c.textMuted,
      fontWeight: '600',
    },
    soundActionLabelPrimary: { color: c.primaryDark },
    // City list header — RTL layout
    cityListHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    cityListTitleRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
    },
    // Label without bottom margin for inline use in the list header row
    cityListLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    selectAllBtn: {
      fontSize: 13,
      color: c.primaryDark,
      fontWeight: '600',
    },
    clearBtn: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '500',
    },
    // Exact match toggle
    exactMatchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surfaceLight,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
    },
    exactMatchTexts: {
      flex: 1,
      alignItems: 'flex-end',
      gap: 3,
    },
    exactMatchTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textMain,
      textAlign: 'right',
    },
    exactMatchDesc: {
      fontSize: 11,
      color: c.textMuted,
      textAlign: 'right',
    },
    loader: { marginVertical: 20 },
    emptyText: {
      textAlign: 'center',
      color: c.textMuted,
      fontSize: 14,
      marginTop: 30,
    },
    listContent: { paddingBottom: 20 },
  });
}
