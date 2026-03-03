import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLiveAlertContext } from '../../src/context/LiveAlertContext';
import { useAlertHistoryContext } from '../../src/context/AlertHistoryContext';
import { HistoryItem } from '../../src/components/HistoryItem';
import { usePreferencesContext } from '../../src/context/PreferencesContext';
import { useTheme } from '../../src/hooks/useTheme';
import type { AppColors } from '../../src/hooks/useTheme';
import { matchesCityFilter, matchesSingleCity } from '../../src/utils/cityFilter';
import { getAlertIcon } from '../../src/utils/alertIcon';
import { getAlertColors } from '../../src/utils/alertColors';
import { getCityCoords } from '../../src/data/cityCoordinates';

function buildMiniMapHTML(
  markers: Array<{ lat: number; lon: number; color: string }>,
  isDark: boolean,
): string {
  const markersJson = JSON.stringify(markers);
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{height:100%;width:100%}
    body{background:${isDark ? '#0f172a' : '#e8f4f8'}}
    .leaflet-control-attribution{display:none!important}
  </style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map=L.map('map',{zoomControl:false,dragging:false,scrollWheelZoom:false,
    touchZoom:false,doubleClickZoom:false,keyboard:false,attributionControl:false})
    .setView([31.5,35.0],7);
  L.tileLayer('${tileUrl}',{maxZoom:19,subdomains:'abcd'}).addTo(map);
  ${markersJson}.forEach(function(m){
    L.circleMarker([m.lat,m.lon],{radius:5,color:m.color,fillColor:m.color,
      fillOpacity:0.75,weight:1.5}).addTo(map);
  });
</script>
</body></html>`;
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'עכשיו';
  if (diffMin < 60) return `לפני ${diffMin} דק'`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `לפני ${diffHr} שע'`;
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

export default function HomeScreen() {
  const router = useRouter();
  const { currentAlert, matchedCities } = useLiveAlertContext();
  const { allItems, displayedItems, loading } = useAlertHistoryContext();
  const { prefs } = usePreferencesContext();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const showAlert = currentAlert !== null && matchedCities.length > 0;
  const alertCities = showAlert ? matchedCities : [];
  const liveAlertIcon = currentAlert
    ? getAlertIcon(currentAlert.title, parseInt(currentAlert.cat) || undefined)
    : '⚠️';
  const liveAlertColors = useMemo(
    () => currentAlert
      ? getAlertColors(currentAlert.title, parseInt(currentAlert.cat) || undefined)
      : { primary: colors.alertOrangeDark, soft: `${colors.alertOrange}18` },
    [currentAlert, colors],
  );

  // Filter history by selected cities (empty = show all).
  // When filter is active use allItems so the preview searches the full dataset.
  const filteredHistory = useMemo(() => {
    if (prefs.selectedCities.length === 0) return displayedItems;
    return allItems.filter((item) =>
      matchesCityFilter(item.data, prefs.selectedCities, prefs.exactCityMatch ?? false)
    );
  }, [allItems, displayedItems, prefs.selectedCities, prefs.exactCityMatch]);

  const previewItems = filteredHistory.slice(0, 3);

  // Last event for the hero card when no live alert is active
  const lastEvent = filteredHistory[0] ?? null;
  const lastEventIcon = lastEvent
    ? getAlertIcon(lastEvent.title, lastEvent.category)
    : null;
  const lastEventTime = lastEvent ? formatRelativeTime(lastEvent.alertDate) : '';
  // Mini map markers — last 24h, up to 60 unique cities, colored by alert type
  const miniMapMarkers = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const seen = new Set<string>();
    const result: Array<{ lat: number; lon: number; color: string }> = [];
    for (const item of allItems) {
      const d = new Date(item.alertDate);
      if (isNaN(d.getTime()) || d.getTime() < cutoff) break;
      const { primary } = getAlertColors(item.title, item.category);
      const cities = item.data.split(',').map((s) => s.trim()).filter(Boolean);
      for (const city of cities) {
        if (seen.has(city)) continue;
        const coords = getCityCoords(city);
        if (!coords) continue;
        seen.add(city);
        result.push({ lat: coords.lat, lon: coords.lon, color: primary });
        if (result.length >= 60) return result;
      }
    }
    return result;
  }, [allItems]);

  const miniMapHtml = useMemo(
    () => buildMiniMapHTML(miniMapMarkers, isDark),
    [miniMapMarkers, isDark],
  );

  const lastEventCities = useMemo(() => {
    if (!lastEvent) return [];
    const all = lastEvent.data.split(',').map((s) => s.trim()).filter(Boolean);
    if (prefs.selectedCities.length > 0) {
      return all.filter((city) =>
        matchesSingleCity(city, prefs.selectedCities, prefs.exactCityMatch ?? false)
      );
    }
    return all.slice(0, 5);
  }, [lastEvent, prefs.selectedCities, prefs.exactCityMatch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>צבע שקט</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updatedText}>עודכן לאחרונה: לפני רגע</Text>

        {/* Hero card */}
        {showAlert && currentAlert ? (
          <View style={[styles.alertHero, {
            backgroundColor: liveAlertColors.primary,
            shadowColor: liveAlertColors.primary,
          }]}>
            <View style={styles.heroIconWrap}>
              <Text style={styles.heroIcon}>{liveAlertIcon}</Text>
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
        ) : lastEvent ? (
          /* Calm card + last-event footer */
          <View style={styles.calmHero}>
            <View style={styles.heroIconWrapCalm}>
              <Text style={styles.heroIconCalm}>🌿</Text>
            </View>
            <Text style={styles.calmTitle}>הכל רגוע</Text>
            <Text style={styles.calmSubtitle}>אין התרעות פעילות כרגע</Text>

            <View style={styles.lastEventDivider} />

            <Text style={styles.lastEventRow}>
              {lastEventIcon}{'  '}{lastEvent.title} · {lastEventTime}
            </Text>
            {lastEventCities.length > 0 && (
              <View style={styles.citiesWrap}>
                {lastEventCities.slice(0, 4).map((city, i) => (
                  <View key={i} style={styles.cityBadge}>
                    <Text style={styles.cityBadgeText}>{city}</Text>
                  </View>
                ))}
                {lastEventCities.length > 4 && (
                  <View style={styles.cityBadge}>
                    <Text style={styles.cityBadgeText}>+{lastEventCities.length - 4}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          /* True calm — no history at all */
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
              <Text style={styles.emptyText}>
                {prefs.selectedCities.length > 0
                  ? 'אין היסטוריה עבור הישובים הנבחרים'
                  : 'אין היסטוריה זמינה'}
              </Text>
            )}
          </View>
        )}

        {/* Map preview card */}
        <View style={styles.mapCard}>
          {/* Real mini-map — non-interactive, purely visual */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <WebView
              source={{ html: miniMapHtml }}
              style={{ flex: 1 }}
              scrollEnabled={false}
              javaScriptEnabled
              originWhitelist={['*']}
              mixedContentMode="always"
            />
          </View>
          {/* Dark overlay with text */}
          <View style={styles.mapCardOverlay} pointerEvents="none">
            <View style={styles.realtimeBadge}>
              <View style={styles.realtimeDot} />
              <Text style={styles.realtimeText}>בזמן אמת</Text>
            </View>
            <View style={styles.mapCardBottom}>
              <Text style={styles.mapCardTitle}>מפת התרעות</Text>
              <Text style={styles.mapCardSub}>לחץ לצפייה במפה המלאה בזמן אמת</Text>
            </View>
          </View>
          {/* Transparent pressable on top — captures taps without interfering with WebView rendering */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => router.push('/(tabs)/map')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bgLight },
    header: {
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.bgLight,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: c.textMain },
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
    lastEventDivider: {
      width: '75%',
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(255,255,255,0.3)',
      marginVertical: 14,
    },
    lastEventRow: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginBottom: 10,
    },
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
    mapCardOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15,23,42,0.45)',
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
  });
}
