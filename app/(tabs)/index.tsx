import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLiveAlertContext } from '../../src/context/LiveAlertContext';
import { useAlertHistoryContext } from '../../src/context/AlertHistoryContext';
import { HistoryItem } from '../../src/components/HistoryItem';
import { usePreferencesContext } from '../../src/context/PreferencesContext';
import { useTheme } from '../../src/hooks/useTheme';
import type { AppColors } from '../../src/hooks/useTheme';

const APP_VERSION = '1.0.0';
const DRAWER_WIDTH = 280;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentAlert, matchedCities } = useLiveAlertContext();
  const { displayedItems, loading } = useAlertHistoryContext();
  const { prefs } = usePreferencesContext();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }, [slideAnim]);

  const showAlert = currentAlert !== null && matchedCities.length > 0;
  const alertCities = showAlert ? matchedCities : [];

  // Filter history by selected cities (empty = show all)
  const filteredHistory = useMemo(() => {
    if (prefs.selectedCities.length === 0) return displayedItems;
    return displayedItems.filter((item) =>
      prefs.selectedCities.some((city) =>
        item.data.toLowerCase().includes(city.toLowerCase())
      )
    );
  }, [displayedItems, prefs.selectedCities]);

  const previewItems = filteredHistory.slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} hitSlop={12}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>צבע שקט</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
          <Text style={styles.settingsLink}>הגדרות</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updatedText}>עודכן לאחרונה: לפני רגע</Text>

        {/* Hero card */}
        {showAlert && currentAlert ? (
          <View style={styles.alertHero}>
            <View style={styles.heroIconWrap}>
              <Text style={styles.heroIcon}>⚠️</Text>
            </View>
            <Text style={styles.heroTitle}>{currentAlert.title}</Text>
            <Text style={styles.heroSubtitle}>{currentAlert.desc}</Text>
            <View style={styles.citiesWrap}>
              {alertCities.slice(0, 6).map((city, i) => (
                <View key={i} style={styles.cityBadge}>
                  <Text style={styles.cityBadgeText}>{city}</Text>
                </View>
              ))}
              {alertCities.length > 6 && (
                <View style={styles.cityBadge}>
                  <Text style={styles.cityBadgeText}>+{alertCities.length - 6}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.calmHero}>
            <View style={styles.heroIconWrapCalm}>
              <Text style={styles.heroIconCalm}>🌿</Text>
            </View>
            <Text style={styles.calmTitle}>הכל רגוע</Text>
            <Text style={styles.calmSubtitle}>אין התרעות פעילות כרגע</Text>
          </View>
        )}

        {/* History preview */}
        <View style={styles.sectionRow}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.seeAll}>ראה הכל</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>היסטוריית התרעות</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primaryDark} style={styles.loader} />
        ) : (
          <View style={styles.historyList}>
            {previewItems.map((item, i) => (
              <HistoryItem key={`${item.alertDate}-${i}`} item={item} />
            ))}
            {previewItems.length === 0 && (
              <Text style={styles.emptyText}>אין היסטוריה זמינה</Text>
            )}
          </View>
        )}

        {/* Map preview card */}
        <TouchableOpacity
          style={styles.mapCard}
          onPress={() => router.push('/(tabs)/map')}
          activeOpacity={0.85}
        >
          <View style={styles.mapCardBg}>
            <View style={styles.mapCardOverlay}>
              <View style={styles.realtimeBadge}>
                <View style={styles.realtimeDot} />
                <Text style={styles.realtimeText}>בזמן אמת</Text>
              </View>
              <View style={styles.mapCardBottom}>
                <Text style={styles.mapCardTitle}>מפת התרעות</Text>
                <Text style={styles.mapCardSub}>לחץ לצפייה במפה המלאה בזמן אמת</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Hamburger slide-in drawer */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <Pressable style={styles.drawerBackdrop} onPress={closeDrawer}>
          <Pressable onPress={() => {}}>
            <Animated.View
              style={[
                styles.drawerPanel,
                { paddingTop: insets.top + 8 },
                { transform: [{ translateX: slideAnim }] },
              ]}
            >
              {/* Close */}
              <TouchableOpacity style={styles.drawerClose} onPress={closeDrawer}>
                <Text style={styles.drawerCloseIcon}>✕</Text>
              </TouchableOpacity>

              {/* App identity */}
              <View style={styles.drawerAppSection}>
                <Text style={styles.drawerAppIcon}>🛡️</Text>
                <Text style={styles.drawerAppName}>צבע שקט</Text>
                <Text style={styles.drawerAppVersion}>גרסה {APP_VERSION}</Text>
              </View>

              <View style={styles.drawerDivider} />

              {/* Navigation */}
              <Text style={styles.drawerSectionLabel}>ניווט</Text>
              {([
                { icon: '🏠', label: 'ראשי', route: '/(tabs)/index' },
                { icon: '🗺️', label: 'מפה', route: '/(tabs)/map' },
                { icon: '🕐', label: 'היסטוריה', route: '/(tabs)/history' },
                { icon: '⚙️', label: 'הגדרות', route: '/(tabs)/settings' },
              ] as const).map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.drawerNavItem}
                  onPress={() => { closeDrawer(); router.push(item.route); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.drawerNavIcon}>{item.icon}</Text>
                  <Text style={styles.drawerNavLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.drawerDivider} />

              {/* About */}
              <Text style={styles.drawerSectionLabel}>אודות</Text>
              <Text style={styles.drawerAboutText}>
                אפליקציה לניטור התרעות פיקוד העורף בזמן אמת. מבוסס על ממשק ה-API הרשמי של פיקוד העורף.
              </Text>

              <View style={styles.drawerFooter}>
                <Text style={styles.drawerFooterText}>
                  {isDark ? '🌙 מצב לילה' : '☀️ מצב יום'}
                </Text>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
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
    menuIcon: { fontSize: 22, color: c.textMuted },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: c.textMain },
    settingsLink: { fontSize: 14, fontWeight: '600', color: c.primaryDark },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
    updatedText: {
      textAlign: 'center',
      fontSize: 11,
      color: c.textMuted,
      marginVertical: 10,
    },
    calmHero: {
      borderRadius: 16,
      padding: 28,
      alignItems: 'center',
      minHeight: 200,
      justifyContent: 'center',
      backgroundColor: c.calmTeal,
      marginBottom: 8,
      shadowColor: c.calmTeal,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    heroIconWrapCalm: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: 50,
      padding: 16,
      marginBottom: 14,
    },
    heroIconCalm: { fontSize: 40 },
    calmTitle: { fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 6 },
    calmSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
    alertHero: {
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      minHeight: 200,
      justifyContent: 'center',
      backgroundColor: c.alertOrangeDark,
      marginBottom: 8,
      shadowColor: c.alertOrange,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    heroIconWrap: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 50,
      padding: 16,
      marginBottom: 12,
    },
    heroIcon: { fontSize: 40 },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
      textAlign: 'center',
      marginBottom: 4,
    },
    heroSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
      marginBottom: 14,
    },
    citiesWrap: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: 6,
      justifyContent: 'center',
    },
    cityBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    cityBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: c.textMain,
      textAlign: 'right',
    },
    seeAll: { fontSize: 13, fontWeight: '600', color: c.primaryDark },
    historyList: { gap: 8 },
    loader: { marginVertical: 20 },
    emptyText: {
      textAlign: 'center',
      color: c.textMuted,
      fontSize: 14,
      paddingVertical: 20,
    },
    mapCard: {
      marginTop: 20,
      borderRadius: 16,
      overflow: 'hidden',
      height: 160,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    mapCardBg: { flex: 1, backgroundColor: c.mapCardBg },
    mapCardOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.5)',
      padding: 14,
      justifyContent: 'flex-end',
    },
    mapCardBottom: { gap: 3 },
    mapCardTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'right' },
    mapCardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'right' },
    realtimeBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(15,23,42,0.75)',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      gap: 5,
    },
    realtimeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.calmTeal },
    realtimeText: { color: '#fff', fontSize: 11, fontWeight: '500' },
    // Drawer
    drawerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    drawerPanel: {
      width: DRAWER_WIDTH,
      height: '100%',
      backgroundColor: c.bgLight,
      paddingHorizontal: 20,
      paddingBottom: 40,
      shadowColor: '#000',
      shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 20,
    },
    drawerClose: { alignSelf: 'flex-end', padding: 8, marginBottom: 4 },
    drawerCloseIcon: { fontSize: 18, color: c.textMuted },
    drawerAppSection: { alignItems: 'flex-end', paddingVertical: 12 },
    drawerAppIcon: { fontSize: 40, marginBottom: 8 },
    drawerAppName: { fontSize: 22, fontWeight: '800', color: c.textMain },
    drawerAppVersion: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    drawerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: 16,
    },
    drawerSectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textMuted,
      textAlign: 'right',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    drawerNavItem: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: 10,
    },
    drawerNavIcon: { fontSize: 20, width: 28, textAlign: 'center' },
    drawerNavLabel: { fontSize: 16, fontWeight: '600', color: c.textMain },
    drawerAboutText: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: 'right',
      lineHeight: 20,
    },
    drawerFooter: { position: 'absolute', bottom: 40, right: 20 },
    drawerFooterText: { fontSize: 12, color: c.textMuted },
  });
}
