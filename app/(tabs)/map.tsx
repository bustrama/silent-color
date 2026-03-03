import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useLiveAlertContext } from '../../src/context/LiveAlertContext';
import { useAlertHistoryContext } from '../../src/context/AlertHistoryContext';
import { getCityCoords } from '../../src/data/cityCoordinates';
import { getAlertIcon } from '../../src/utils/alertIcon';
import { getAlertColors } from '../../src/utils/alertColors';
import { useTheme } from '../../src/hooks/useTheme';
import type { AppColors } from '../../src/hooks/useTheme';
import type { HistoryAlert } from '../../src/types';

interface MapMarker {
  city: string;
  lat: number;
  lon: number;
  color: string;
  fillColor: string;
  label: string;
}

const LEGEND_ITEMS = [
  { color: '#ef4444', icon: '🚀', label: 'ירי רקטות / טילים' },
  { color: '#9333ea', icon: '✈️', label: 'כלי טיס עוין / מזל"ט' },
  { color: '#f97316', icon: '🔫', label: 'חדירת מחבלים' },
  { color: '#ca8a04', icon: '⏰', label: 'בדקות הקרובות' },
  { color: '#64748b', icon: '✅', label: 'אירוע שהסתיים' },
  { color: '#ef4444', icon: '⚡', label: 'התרעה פעילה (מהבהב)' },
];

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

function buildRecentMarkers(allItems: HistoryAlert[]): MapMarker[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  const result: MapMarker[] = [];

  for (const item of allItems) {
    const d = new Date(item.alertDate);
    if (isNaN(d.getTime()) || d.getTime() < cutoff) break;

    const { primary } = getAlertColors(item.title, item.category);
    const label = `${item.title} · ${formatRelativeTime(item.alertDate)}`;

    const cities = item.data.split(',').map((s) => s.trim()).filter(Boolean);
    for (const cityName of cities) {
      if (seen.has(cityName)) continue;
      const coords = getCityCoords(cityName);
      if (!coords) continue;
      seen.add(cityName);
      result.push({ city: cityName, lat: coords.lat, lon: coords.lon, color: primary, fillColor: primary, label });
    }
    if (result.length >= 150) break;
  }
  return result;
}

function buildMapHTML(isDark: boolean): string {
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttrib = isDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { height: 100%; width: 100%; }
    body { background: ${isDark ? '#0f172a' : '#e8f4f8'}; }
    .alert-pulse { animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse {
      0%   { transform: scale(1);   opacity: 1; }
      50%  { transform: scale(1.7); opacity: 0.45; }
      100% { transform: scale(1);   opacity: 1; }
    }
    .leaflet-popup-content { direction: rtl; text-align: right; }
    .leaflet-control-attribution {
      background: ${isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.75)'} !important;
      color: ${isDark ? '#94a3b8' : '#64748b'} !important;
      font-size: 9px;
    }
    .leaflet-control-attribution a { color: ${isDark ? '#7dd3fc' : '#0284c7'} !important; }
    .leaflet-bar a {
      background: ${isDark ? '#1e293b' : '#fff'} !important;
      color: ${isDark ? '#e2e8f0' : '#374151'} !important;
      border-color: ${isDark ? '#334155' : '#ccc'} !important;
    }
    .leaflet-bar a:hover { background: ${isDark ? '#334155' : '#f0f0f0'} !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: false }).setView([31.5, 35.0], 7);

  L.tileLayer('${tileUrl}', {
    attribution: '${tileAttrib}',
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  // Track whether the user has manually moved/zoomed the map
  var userHasMoved = false;
  map.on('dragend zoomend', function() { userHasMoved = true; });

  // Recent history layer
  var recentLayer = L.layerGroup().addTo(map);

  // Live alert markers
  var liveMarkers = [];
  var prevLiveCount = 0;

  function refreshRecent(data) {
    recentLayer.clearLayers();
    data.forEach(function(m) {
      L.circleMarker([m.lat, m.lon], {
        radius: 7,
        color: m.color,
        fillColor: m.fillColor,
        fillOpacity: 0.55,
        weight: 2
      }).addTo(recentLayer).bindPopup(
        '<b>' + m.city + '</b>' +
        (m.label ? '<br><small style="opacity:0.75">' + m.label + '</small>' : '')
      );
    });
  }

  function refreshLive(data) {
    liveMarkers.forEach(function(m) { map.removeLayer(m); });
    liveMarkers = [];
    if (data.length === 0) { prevLiveCount = 0; return; }

    var bounds = [];
    data.forEach(function(m) {
      var circle = L.circleMarker([m.lat, m.lon], {
        radius: 16,
        color: m.color,
        fillColor: m.fillColor,
        fillOpacity: 0.85,
        weight: 2.5,
        className: 'alert-pulse'
      }).addTo(map).bindPopup(
        '<b>' + m.city + '</b>' +
        (m.label ? '<br><small style="opacity:0.75">' + m.label + '</small>' : '')
      );
      liveMarkers.push(circle);
      bounds.push([m.lat, m.lon]);
    });

    // Only auto-zoom when a NEW alert appears (was 0, now has markers)
    // and the user has not manually navigated the map yet
    if (prevLiveCount === 0 && !userHasMoved) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 11);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
    prevLiveCount = data.length;
  }

  function onMessage(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'UPDATE_LIVE')   refreshLive(msg.markers);
      if (msg.type === 'UPDATE_RECENT') refreshRecent(msg.markers);
    } catch(err) {}
  }
  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage);
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const webviewRef = useRef<WebView>(null);
  const { currentAlert, matchedCities } = useLiveAlertContext();
  const { allItems } = useAlertHistoryContext();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [legendVisible, setLegendVisible] = useState(false);

  const alertCities = matchedCities;

  const recentMarkers = useMemo(() => buildRecentMarkers(allItems), [allItems]);

  const liveMarkers = useMemo(() => {
    const { primary } = currentAlert
      ? getAlertColors(currentAlert.title, parseInt(currentAlert.cat) || undefined)
      : { primary: '#ef4444' };
    return alertCities
      .map((city) => {
        const coords = getCityCoords(city);
        if (!coords) return null;
        return { city, lat: coords.lat, lon: coords.lon, color: primary, fillColor: primary, label: currentAlert?.title ?? '' };
      })
      .filter(Boolean) as MapMarker[];
  }, [alertCities, currentAlert]);

  // Send live markers via postMessage — no HTML rebuild, no zoom reset
  useEffect(() => {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'UPDATE_LIVE', markers: liveMarkers }));
  }, [liveMarkers]);

  // Send recent markers via postMessage — no HTML rebuild, preserves user zoom
  useEffect(() => {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'UPDATE_RECENT', markers: recentMarkers }));
  }, [recentMarkers]);

  // On initial load push both layers
  const onWebViewLoad = useCallback(() => {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'UPDATE_LIVE', markers: liveMarkers }));
    webviewRef.current?.postMessage(JSON.stringify({ type: 'UPDATE_RECENT', markers: recentMarkers }));
  }, [liveMarkers, recentMarkers]);

  // HTML rebuilt only when dark mode changes (never for marker updates)
  const initialHtml = useMemo(() => buildMapHTML(isDark), [isDark]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>מפת התראות</Text>
        <View style={styles.headerIcon}>
          <Text style={{ fontSize: 20 }}>🗺️</Text>
        </View>
      </View>

      {/* Status bar */}
      {currentAlert ? (
        <View style={[styles.alertBar, { backgroundColor: `${getAlertColors(currentAlert.title, parseInt(currentAlert.cat) || undefined).primary}18`, borderBottomColor: `${getAlertColors(currentAlert.title, parseInt(currentAlert.cat) || undefined).primary}40` }]}>
          <Text style={[styles.alertBarText, { color: getAlertColors(currentAlert.title, parseInt(currentAlert.cat) || undefined).primary }]}>
            {getAlertIcon(currentAlert.title, parseInt(currentAlert.cat) || undefined)}{' '}
            {currentAlert.title} — {alertCities.slice(0, 3).join(', ')}
            {alertCities.length > 3 ? ` +${alertCities.length - 3}` : ''}
          </Text>
        </View>
      ) : (
        <View style={styles.calmBar}>
          <View style={styles.calmDot} />
          <Text style={styles.calmBarText}>הכל רגוע</Text>
          {recentMarkers.length > 0 && (
            <Text style={styles.calmBarSub}>· {recentMarkers.length} אזורים ב-24 שע'</Text>
          )}
        </View>
      )}

      {/* Map + legend overlay */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          source={{ html: initialHtml }}
          style={styles.webview}
          onLoad={onWebViewLoad}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
        />

        {/* Legend toggle button */}
        <TouchableOpacity
          style={styles.legendBtn}
          onPress={() => setLegendVisible((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.legendBtnText}>מקרא</Text>
        </TouchableOpacity>

        {/* Legend panel */}
        {legendVisible && (
          <View style={styles.legendPanel}>
            {LEGEND_ITEMS.map((item, i) => (
              <View key={i} style={styles.legendRow}>
                <Text style={styles.legendIcon}>{item.icon}</Text>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors, isDark: boolean) {
  const panelBg = isDark ? '#1e293b' : '#fff';
  const panelText = isDark ? '#e2e8f0' : '#1e293b';

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
    headerTitle: { fontSize: 18, fontWeight: '700', color: c.textMain },
    headerIcon: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: `${c.alertOrange}20`,
      alignItems: 'center', justifyContent: 'center',
    },
    alertBar: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    alertBarText: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
    calmBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
      backgroundColor: `${c.calmTeal}15`,
      paddingHorizontal: 16, paddingVertical: 7,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${c.calmTeal}30`,
    },
    calmDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.calmTeal },
    calmBarText: { color: c.calmTealDark, fontSize: 13, fontWeight: '600' },
    calmBarSub: { color: c.textMuted, fontSize: 11 },
    mapContainer: { flex: 1 },
    webview: { flex: 1 },
    // Legend
    legendBtn: {
      position: 'absolute',
      bottom: 96,   // above the Leaflet zoom controls
      right: 10,
      backgroundColor: panelBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 4,
    },
    legendBtnText: { fontSize: 12, fontWeight: '700', color: panelText },
    legendPanel: {
      position: 'absolute',
      bottom: 128,
      right: 10,
      backgroundColor: panelBg,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
      minWidth: 220,
    },
    legendRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    legendIcon: { fontSize: 14, width: 22, textAlign: 'center' },
    legendDot: { width: 11, height: 11, borderRadius: 6 },
    legendLabel: { fontSize: 12, fontWeight: '500', color: panelText, flex: 1, textAlign: 'right' },
  });
}
