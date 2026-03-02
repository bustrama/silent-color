import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useLiveAlertContext } from '../../src/context/LiveAlertContext';
import { getCityCoords } from '../../src/data/cityCoordinates';
import { useTheme } from '../../src/hooks/useTheme';
import type { AppColors } from '../../src/hooks/useTheme';

function buildMapHTML(alertCities: string[], isDark: boolean): string {
  const markers = alertCities
    .map((city) => {
      const coords = getCityCoords(city);
      if (!coords) return null;
      return { city, lat: coords.lat, lon: coords.lon };
    })
    .filter(Boolean);

  const markersJson = JSON.stringify(markers);
  const mapBg = isDark ? '#1e293b' : '#e8f4f8';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { height: 100%; width: 100%; background: ${mapBg}; }
    .alert-pulse { animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse {
      0%   { transform: scale(1);   opacity: 1;   }
      50%  { transform: scale(1.6); opacity: 0.5; }
      100% { transform: scale(1);   opacity: 1;   }
    }
    ${isDark ? `.leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }` : ''}
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: false }).setView([31.5, 35.0], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(map);

  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  var alertMarkers = [];
  var markers = ${markersJson};

  function refreshMarkers() {
    alertMarkers.forEach(function(m) { map.removeLayer(m); });
    alertMarkers = [];
    if (markers.length === 0) return;
    var bounds = [];
    markers.forEach(function(m) {
      var circle = L.circleMarker([m.lat, m.lon], {
        radius: 14,
        color: '#f97316',
        fillColor: '#fb923c',
        fillOpacity: 0.75,
        weight: 2,
        className: 'alert-pulse'
      }).addTo(map).bindPopup(m.city);
      alertMarkers.push(circle);
      bounds.push([m.lat, m.lon]);
    });
    if (bounds.length === 1) {
      map.setView(bounds[0], 11);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  refreshMarkers();

  window.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'UPDATE_MARKERS') { markers = data.markers; refreshMarkers(); }
    } catch(err) {}
  });
  document.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'UPDATE_MARKERS') { markers = data.markers; refreshMarkers(); }
    } catch(err) {}
  });
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const webviewRef = useRef<WebView>(null);
  const { currentAlert, matchedCities } = useLiveAlertContext();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // matchedCities is [] when no alert, or the relevant city list when alert is active
  const alertCities = matchedCities;

  const updateMap = useCallback(() => {
    const markers = alertCities
      .map((city) => {
        const coords = getCityCoords(city);
        if (!coords) return null;
        return { city, lat: coords.lat, lon: coords.lon };
      })
      .filter(Boolean);

    webviewRef.current?.postMessage(
      JSON.stringify({ type: 'UPDATE_MARKERS', markers })
    );
  }, [alertCities]);

  useEffect(() => {
    updateMap();
  }, [updateMap]);

  const initialHtml = buildMapHTML(alertCities, isDark);

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
            🔴 {currentAlert.title} — {alertCities.slice(0, 3).join(', ')}
            {alertCities.length > 3 ? ` +${alertCities.length - 3}` : ''}
          </Text>
        </View>
      ) : (
        <View style={styles.calmBar}>
          <View style={styles.calmDot} />
          <Text style={styles.calmBarText}>הכל רגוע</Text>
        </View>
      )}

      {/* Map */}
      <WebView
        ref={webviewRef}
        source={{ html: initialHtml }}
        style={styles.webview}
        onLoad={updateMap}
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
    webview: { flex: 1 },
  });
}
