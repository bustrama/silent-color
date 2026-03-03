import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { useCities } from '../../src/hooks/useCities';
import { usePreferencesContext } from '../../src/context/PreferencesContext';
import { CityRow } from '../../src/components/CityRow';
import { useTheme } from '../../src/hooks/useTheme';
import type { AppColors } from '../../src/hooks/useTheme';
import type { SoundSetting } from '../../src/types';
import { playAlertSound, stopAlertSound } from '../../src/services/notificationService';

const MAX_RECORD_SECS = 30;

function formatRecordTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SOUND_OPTIONS: { label: string; value: SoundSetting; icon: string }[] = [
  { label: 'צליל התראה', value: 'sound', icon: '🔔' },
  { label: 'רטט בלבד', value: 'vibrate', icon: '📳' },
  { label: 'שקט', value: 'silent', icon: '🔕' },
];

// ─── Alert categories ─────────────────────────────────────────────────────────

const ALERT_CATEGORIES: { id: number; label: string; icon: string }[] = [
  { id: 1,  label: 'רקטות וטילים',       icon: '🚀' },
  { id: 13, label: 'טיל ממדינה עוינת',    icon: '🚀' },
  { id: 2,  label: 'כלי טיס עוין',       icon: '✈️' },
  { id: 5,  label: 'חדירת מחבלים',       icon: '🔫' },
  { id: 3,  label: 'רעידת אדמה',         icon: '🌍' },
  { id: 4,  label: 'חומרים מסוכנים',     icon: '☣️' },
  { id: 6,  label: 'צונאמי',             icon: '🌊' },
  { id: 7,  label: 'נשק לא קונבנציונלי', icon: '☢️' },
  { id: 20, label: 'תרגיל / כללי',       icon: '🔔' },
];

// ─── Volume Slider ────────────────────────────────────────────────────────────

const THUMB = 20;
const THUMB_HALF = THUMB / 2;

/**
 * Smooth drag slider backed by Animated.Value.
 * Fill and thumb position update via .setValue() (no React re-render during drag).
 * onValueChange is called once on tap and once on release — not 60× per second.
 * The 🔊 icon and % label are rendered inside the component itself.
 */
function VolumeSlider({
  value,
  onValueChange,
  color,
}: {
  value: number;
  onValueChange: (v: number) => void;
  color: string;
}) {
  const trackWidthRef = useRef(0);
  const localValueRef = useRef(value);
  const callbackRef = useRef(onValueChange);
  const fillWidth = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = useState(Math.round(value * 100));
  const [hasLayout, setHasLayout] = useState(false);

  useEffect(() => {
    callbackRef.current = onValueChange;
  }, [onValueChange]);

  // isDragging prevents the sync useEffect from resetting fillWidth mid-drag.
  // Without this guard: grant → callbackRef → setAlertVolume → context re-render
  // → value prop changes → useEffect fires → fillWidth.setValue(grantPos) while
  // user is already dragging elsewhere. That caused the visible jitter.
  const isDragging = useRef(false);

  // Sync from external value (e.g. initial load from AsyncStorage).
  // Skipped while dragging so the animated position is never overwritten mid-gesture.
  // addListener is intentionally NOT used — it fires setDisplayPct on every
  // setValue() during drag (~60/s), causing React reconciliation at 60fps.
  useEffect(() => {
    if (isDragging.current) return;
    localValueRef.current = value;
    const tw = trackWidthRef.current;
    if (tw > 0) fillWidth.setValue(tw * value);
    setDisplayPct(Math.round(value * 100));
  }, [value, fillWidth]);

  const panResponder = useRef(
    PanResponder.create({
      // Capture-phase handlers win the gesture BEFORE FlatList's ScrollView sees it,
      // preventing scroll from stealing the touch mid-drag on Android.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Never yield the gesture back to a parent (e.g. FlatList scroll).
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        const v = Math.min(1, Math.max(0, (evt.nativeEvent.locationX - THUMB_HALF) / tw));
        localValueRef.current = v;
        fillWidth.setValue(tw * v);
        setDisplayPct(Math.round(v * 100));
        // callbackRef intentionally NOT called here — calling it would trigger
        // setAlertVolume → React re-render → value prop update → useEffect fires
        // → fillWidth.setValue(grantPos) reset while user is still dragging.
      },
      onPanResponderMove: (evt) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        const v = Math.min(1, Math.max(0, (evt.nativeEvent.locationX - THUMB_HALF) / tw));
        localValueRef.current = v;
        fillWidth.setValue(tw * v); // animated system only — zero React re-renders during drag
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        const v = localValueRef.current;
        setDisplayPct(Math.round(v * 100));
        callbackRef.current(v); // save to prefs once, safely after drag ends
      },
      onPanResponderTerminate: () => {
        // Gesture was forcibly taken away (e.g. incoming call). Still save the value.
        isDragging.current = false;
        callbackRef.current(localValueRef.current);
      },
    })
  ).current;

  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 18 }}>🔊</Text>
      {/* Touch target — holds track, fill and thumb */}
      <View
        style={{ flex: 1, height: 36, justifyContent: 'center' }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          trackWidthRef.current = w - THUMB;
          fillWidth.setValue((w - THUMB) * localValueRef.current);
          setHasLayout(true);
        }}
        {...panResponder.panHandlers}
      >
        {/* Track background */}
        <View
          style={{
            position: 'absolute',
            left: THUMB_HALF,
            right: THUMB_HALF,
            height: 4,
            backgroundColor: '#cbd5e1',
            borderRadius: 2,
          }}
        />
        {/* Animated fill */}
        <Animated.View
          style={{
            position: 'absolute',
            left: THUMB_HALF,
            width: fillWidth,
            height: 4,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
        {/* Animated thumb — transform avoids layout pass; left is fixed at 0 */}
        {hasLayout && (
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: (36 - THUMB) / 2,
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB_HALF,
              backgroundColor: '#fff',
              borderWidth: 2.5,
              borderColor: color,
              elevation: 3,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              transform: [{ translateX: fillWidth }],
            }}
          />
        )}
      </View>
      <Text style={{ fontSize: 12, fontWeight: '700', width: 36, textAlign: 'left', color }}>
        {displayPct}%
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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
    setAlertVolume,
    toggleAlertCategory,
  } = usePreferencesContext();

  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const customInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Audio recorder instance
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Pulsing red dot while recording
  const recordingPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, { toValue: 0.2, duration: 500, useNativeDriver: true }),
          Animated.timing(recordingPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      recordingPulse.stopAnimation();
      recordingPulse.setValue(1);
    }
  }, [isRecording, recordingPulse]);

  // Count-up timer while recording
  useEffect(() => {
    if (!isRecording) { setRecordSecs(0); return; }
    const t = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  // Auto-stop at max duration
  useEffect(() => {
    if (recordSecs >= MAX_RECORD_SECS) handleStopRecord();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordSecs]);

  // Stop recording on unmount if still active
  useEffect(() => {
    return () => { audioRecorder.stop().catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    await stopAlertSound(); // abort any previous playback first
    await playAlertSound('sound', prefs.customSoundUri, prefs.alertVolume ?? 1.0);
  }, [prefs.customSoundUri, prefs.alertVolume]);

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

  const handleStartRecord = useCallback(async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('הרשאה נדרשת', 'יש לאשר גישה למיקרופון בהגדרות המכשיר');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן להתחיל הקלטה');
    }
  }, [audioRecorder]);

  const handleStopRecord = useCallback(async () => {
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        setCustomSound(uri, `הקלטה ${time}`);
      }
    } catch {
      // ignore stop errors
    } finally {
      setIsRecording(false);
    }
  }, [audioRecorder, setCustomSound]);

  const soundFileName = prefs.customSoundName ?? 'alert.wav (ברירת מחדל)';
  const mutedCategories = prefs.mutedAlertCategories ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>בחירת אזורי ניטור</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Single scrollable column: settings + search + city list */}
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
            {/* ── Settings sections (hidden while searching) ── */}
            {!search && (
              <>
                {/* 1. Sound settings */}
                <View style={[styles.section, styles.sectionFirst]}>
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
                      {/* Volume slider row */}
                      <View style={styles.volumeRow}>
                        <VolumeSlider
                          value={prefs.alertVolume ?? 1.0}
                          onValueChange={setAlertVolume}
                          color={colors.primaryDark}
                        />
                      </View>

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

                      {isRecording ? (
                        /* ── Recording state ── */
                        <View style={styles.soundActionRow}>
                          <View style={styles.recordingIndicator}>
                            <Animated.View style={[styles.recordingDot, { opacity: recordingPulse }]} />
                            <Text style={styles.recordingTimer}>{formatRecordTime(recordSecs)}</Text>
                            <Text style={styles.recordingMax}>/ {MAX_RECORD_SECS}שנ'</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.soundActionBtn, styles.recordingStopBtn]}
                            onPress={handleStopRecord}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.soundActionIcon}>⏹</Text>
                            <Text style={[styles.soundActionLabel, styles.recordingStopLabel]}>עצור</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        /* ── Normal state: Test | Pick | Record ── */
                        <View style={styles.soundActionRow}>
                          <TouchableOpacity
                            style={styles.soundActionBtn}
                            onPress={handleTestSound}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.soundActionIcon}>🔊</Text>
                            <Text style={styles.soundActionLabel}>בדוק</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.soundActionBtn}
                            onPress={handlePickSound}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.soundActionIcon}>📁</Text>
                            <Text style={styles.soundActionLabel}>בחר קובץ</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.soundActionBtn, styles.soundActionBtnPrimary]}
                            onPress={handleStartRecord}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.soundActionIcon}>🎙️</Text>
                            <Text style={[styles.soundActionLabel, styles.soundActionLabelPrimary]}>
                              הקלט
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
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

                {/* 4. Alert category filter */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>סוגי התרעות (קול + עדכון)</Text>
                  <Text style={styles.alertCatDesc}>
                    בחר אילו סוגי התרעות יפעילו קול והתראה. ניתן להשתיק סוגים שאינם רלוונטיים.
                  </Text>
                  <View style={styles.alertCatGrid}>
                    {ALERT_CATEGORIES.map((cat) => {
                      const isMuted = mutedCategories.includes(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.alertCatChip,
                            isMuted && styles.alertCatChipMuted,
                          ]}
                          onPress={() => toggleAlertCategory(cat.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.alertCatIcon}>{cat.icon}</Text>
                          <Text
                            style={[
                              styles.alertCatLabel,
                              isMuted && styles.alertCatLabelMuted,
                            ]}
                          >
                            {cat.label}
                          </Text>
                          {isMuted && (
                            <Text style={styles.alertCatMutedBadge}>🔕</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {mutedCategories.length > 0 && (
                    <Text style={styles.alertCatHint}>
                      {mutedCategories.length} {mutedCategories.length === 1 ? 'סוג' : 'סוגים'} מושתקים
                    </Text>
                  )}
                </View>

                {/* 5. Custom city input */}
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

            {/* ── Search bar + city list header ── */}
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
              <View style={styles.cityListTitleRow}>
                <Text style={styles.cityListLabel}>כל היישובים</Text>
                {selectedCount > 0 && (
                  <TouchableOpacity onPress={clearCities}>
                    <Text style={styles.clearBtn}>נקה ({selectedCount})</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => selectAllCities(allLabels)}>
                <Text style={styles.selectAllBtn}>בחר הכל</Text>
              </TouchableOpacity>
            </View>

            {citiesLoading && (
              <ActivityIndicator color={colors.primaryDark} style={styles.loader} />
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
    sectionFirst: {
      marginTop: 16,
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
    // Volume slider row — icon and % are now rendered inside VolumeSlider
    volumeRow: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
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
    // Recording state
    recordingIndicator: {
      flex: 1,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    recordingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#ef4444',
    },
    recordingTimer: {
      fontSize: 15,
      fontWeight: '700',
      color: '#ef4444',
      fontVariant: ['tabular-nums'],
    },
    recordingMax: {
      fontSize: 12,
      color: c.textMuted,
    },
    recordingStopBtn: {
      borderRightWidth: 0,
      backgroundColor: '#ef444415',
    },
    recordingStopLabel: {
      color: '#ef4444',
    },
    // Alert category filter
    alertCatDesc: {
      fontSize: 11,
      color: c.textMuted,
      textAlign: 'right',
      marginBottom: 10,
      lineHeight: 16,
    },
    alertCatGrid: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: 8,
    },
    alertCatChip: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 11,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: c.primaryDark,
      backgroundColor: `${c.primaryDark}12`,
    },
    alertCatChipMuted: {
      borderColor: c.border,
      backgroundColor: c.surfaceLight,
      opacity: 0.55,
    },
    alertCatIcon: { fontSize: 14 },
    alertCatLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.primaryDark,
    },
    alertCatLabelMuted: { color: c.textMuted },
    alertCatMutedBadge: { fontSize: 11 },
    alertCatHint: {
      fontSize: 11,
      color: c.alertOrangeDark,
      textAlign: 'right',
      marginTop: 8,
      fontWeight: '500',
    },
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
