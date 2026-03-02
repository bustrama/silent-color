import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCities } from '../../src/hooks/useCities';
import { usePreferencesContext } from '../../src/context/PreferencesContext';
import { CityRow } from '../../src/components/CityRow';
import { useTheme } from '../../src/hooks/useTheme';
import type { AppColors } from '../../src/hooks/useTheme';
import type { SoundSetting } from '../../src/types';

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
  } = usePreferencesContext();

  const [search, setSearch] = useState('');
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header — no save button (prefs auto-save on every toggle) */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>בחירת אזורי ניטור</Text>
        <View style={styles.headerSpacer} />
      </View>

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
            {/* Selected city badges */}
            {selectedCount > 0 && !search && (
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

            {/* Search */}
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
              </View>
            </View>

            {/* Sound settings */}
            {!search && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>קול התראה</Text>
                <View style={styles.soundRow}>
                  {SOUND_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.soundChip,
                        prefs.soundSetting === opt.value &&
                          styles.soundChipActive,
                      ]}
                      onPress={() => setSoundSetting(opt.value)}
                    >
                      <Text style={styles.soundChipIcon}>{opt.icon}</Text>
                      <Text
                        style={[
                          styles.soundChipLabel,
                          prefs.soundSetting === opt.value &&
                            styles.soundChipLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* City list header */}
            <View style={styles.cityListHeader}>
              <TouchableOpacity onPress={() => selectAllCities(allLabels)}>
                <Text style={styles.selectAllBtn}>בחר הכל</Text>
              </TouchableOpacity>
              <View style={styles.cityListTitleRow}>
                {selectedCount > 0 && (
                  <TouchableOpacity onPress={clearCities}>
                    <Text style={styles.clearBtn}>נקה ({selectedCount})</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.sectionLabel}>כל היישובים</Text>
              </View>
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
      paddingTop: 14,
      paddingBottom: 4,
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
    searchWrap: { padding: 16, paddingBottom: 8 },
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
    cityListHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    cityListTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
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
