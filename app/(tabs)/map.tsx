import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
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
  color: string;      // stroke / border
  fillColor: string;  // fill
  label: string;      // popup subtitle: "title · relative time"
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

function buildRecentMarkers(allItems: HistoryAlert[]): MapMarker[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // last 24 hours
  const seen = new Set<string>();
  const result: MapMarker[] = [];

  for (const item of allItems) {
    const d = new Date(item.alertDate);
    if (isNaN(d.getTime()) || d.getTime() < cutoff) break; // history is newest-first

    const { primary } = getAlertColors(item.title, item.category);
    const label = `${item.title} · ${formatRelativeTime(item.alertDate)}`;

    // data may be a single city or comma-separated list
    const cities = item.data.split(',').map((s) => s.trim()).filter(Boolean);
    for (const cityName of cities) {
      if (seen.has(cityName)) continue;
      const coords = getCityCoords(cityName);
      if (!coords) continue;
      seen.add(cityName);
      result.push({
        city: cityName,
        lat: coords.lat,
        lon: coords.lon,
        color: primary,
        fillColor: primary,
        label,
      });
    }
    if (result.length >= 150) break; // cap at 150 unique markers
  }
  return result;
}

function buildMapHTML(
  alertMarkers: MapMarker[],
  recentMarkers: MapMarker[],
  isDark: boolean
): string {
  const alertJson = JSON.stringify(alertMarkers);
  const recentJson = JSON.stringify(recentMarkers);

  // CartoDB Dark Matter for proper dark mode — no CSS invert tricks
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
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

  // Recent history markers — colored by alert type
  var recentData = ${recentJson};
  recentData.forEach(function(m) {
    L.circleMarker([m.lat, m.lon], {
      radius: 7,
      color: m.color,
      fillColor: m.fillColor,
      fillOpacity: 0.55,
      weight: 2
    }).addTo(map).bindPopup(
      '<b>' + m.city + '</b>' +
      (m.label ? '<br><small style="opacity:0.75">' + m.label + '</small>' : '')
    );
  });

  // Live alert markers (pulsing, updatable via postMessage)
  var liveMarkers = [];
  var liveData = ${alertJson};

  function refreshLive(data) {
    liveMarkers.forEach(function(m) { map.removeLayer(m); });
    liveMarkers = [];
    if (data.length === 0) return;
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
    if (bounds.length === 1) {
      map.setView(bounds[0], 11);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  refreshLive(liveData);

  function onMessage(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'UPDATE_MARKERS') { refreshLive(data.markers); }
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
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const alertCities = matchedCities;

  const recentMarkers = useMemo(
    () => buildRecentMarkers(allItems),
    [allItems]
  );

  const liveMarkers = useMemo(() => {
    const { primary } = currentAlert
      ? getAlertColors(currentAlert.title, parseInt(currentAlert.cat) || undefined)
      : { primary: '#ef4444' };
    return alertCities
      .map((city) => {
        const coords = getCityCoords(city);
        if (!coords) return null;
        return {
          city,
          lat: coords.lat,
          lon: coords.lon,
          color: primary,
          fillColor: primary,
          label: currentAlert?.title ?? '',
        };
      })
      .filter(Boolean) as MapMarker[];
  }, [alertCities, currentAlert]);

  const updateLiveMarkers = useCallback(() => {
    webviewRef.current?.postMessage(
      JSON.stringify({ type: 'UPDATE_MARKERS', markers: liveMarkers })
    );
  }, [liveMarkers]);

  useEffect(() => {
    updateLiveMarkers();
  }, [updateLiveMarkers]);

  const initialHtml = useMemo(
    () => buildMapHTML(liveMarkers, recentMarkers, isDark),
    // Rebuild full HTML only when dark mode or recent markers change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDark, recentMarkers]
  );

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
        <View style={styles.alertBar}>
          <Text style={styles.alertBarText}>
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
            <Text style={styles.calmBarSub}>
              · {recentMarkers.length} אזורים ב-24 שע'
            </Text>
          )}
        </View>
      )}

      {/* Map */}
      <WebView
        ref={webviewRef}
        source={{ html: initialHtml }}
        style={styles.webview}
        onLoad={updateLiveMarkers}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
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
      fontSize: 18,
      fontWeight: '700',
      color: c.textMain,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${c.alertOrange}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertBar: {
      backgroundColor: `${c.alertOrange}18`,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${c.alertOrange}40`,
    },
    alertBarText: {
      color: c.alertOrangeDark,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
    },
    calmBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
      backgroundColor: `${c.calmTeal}15`,
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${c.calmTeal}30`,
    },
    calmDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.calmTeal,
    },
    calmBarText: {
      color: c.calmTealDark,
      fontSize: 13,
      fontWeight: '600',
    },
    calmBarSub: {
      color: c.textMuted,
      fontSize: 11,
    },
    webview: { flex: 1 },
  });
}
