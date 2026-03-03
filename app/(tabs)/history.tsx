import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlertHistoryContext } from '../../src/context/AlertHistoryContext';
import { usePreferencesContext } from '../../src/context/PreferencesContext';
import { HistoryItem } from '../../src/components/HistoryItem';
import { useTheme } from '../../src/hooks/useTheme';
import type { AppColors } from '../../src/hooks/useTheme';
import type { HistoryAlert } from '../../src/types';
import { matchesCityFilter } from '../../src/utils/cityFilter';

type Section = { type: 'header'; label: string } | { type: 'item'; item: HistoryAlert };

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'היום';
  if (d.toDateString() === yesterday.toDateString()) return 'אתמול';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function HistoryScreen() {
  const { allItems, displayedItems, loading, hasMore, loadMore } = useAlertHistoryContext();
  const { prefs } = usePreferencesContext();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const filterActive = prefs.selectedCities.length > 0 || search.trim().length > 0;

  // When a filter is active, search the FULL dataset so no results are missed.
  // When no filter, use the paginated displayedItems to keep scrolling smooth.
  const baseItems = filterActive ? allItems : displayedItems;

  const filtered = useMemo(() => {
    let items = baseItems;

    if (prefs.selectedCities.length > 0) {
      items = items.filter((item) =>
        matchesCityFilter(item.data, prefs.selectedCities, prefs.exactCityMatch ?? false)
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (item) => item.data.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)
      );
    }

    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItems, prefs.selectedCities, search]);

  // Build date-grouped sections
  const sections = useMemo((): Section[] => {
    const result: Section[] = [];
    let lastLabel = '';
    for (const item of filtered) {
      const label = getDateLabel(item.alertDate);
      if (label !== lastLabel) {
        result.push({ type: 'header', label });
        lastLabel = label;
      }
      result.push({ type: 'item', item });
    }
    return result;
  }, [filtered]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>היסטוריית התראות</Text>
      </View>

      {/* City filter indicator */}
      {prefs.selectedCities.length > 0 && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterText}>
            🎯 מסונן: {prefs.selectedCities.length} ישובים נבחרים
          </Text>
        </View>
      )}

      {/* Search + pulse */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש לפי שם ישוב..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
            returnKeyType="search"
          />
        </View>
        <View style={styles.pulsePill}>
          <View style={styles.pulseDotOuter}>
            <View style={styles.pulseDotInner} />
          </View>
          <Text style={styles.pulseText}>מתעדכן בזמן אמת (כל 10 שניות)</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={colors.primaryDark} size="large" style={styles.loader} />
      ) : (
        <FlatList<Section>
          data={sections}
          keyExtractor={(s, i) =>
            s.type === 'header' ? `header-${s.label}` : `item-${s.item.alertDate}-${i}`
          }
          renderItem={({ item: s }) => {
            if (s.type === 'header') {
              return (
                <View style={styles.dateHeader}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateLabel}>{s.label}</Text>
                  <View style={styles.dateLine} />
                </View>
              );
            }
            return <HistoryItem item={s.item} />;
          }}
          // Pagination only makes sense in unfiltered mode
          onEndReached={!filterActive && hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {prefs.selectedCities.length > 0
                ? 'אין היסטוריה עבור הישובים הנבחרים'
                : 'אין היסטוריה זמינה'}
            </Text>
          }
          // Footer spinner only when unfiltered and more pages exist
          ListFooterComponent={
            !filterActive && hasMore ? (
              <ActivityIndicator color={colors.primaryDark} style={styles.footerLoader} />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bgLight },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: c.bgLight,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: c.textMain,
      textAlign: 'center',
    },
    searchWrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: c.bgLight,
      gap: 10,
    },
    searchBar: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: `${c.mutedTealSoft}80`,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    searchIcon: { fontSize: 16 },
    searchInput: {
      flex: 1,
      color: c.textMain,
      fontSize: 15,
    },
    pulsePill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: `${c.mutedTealSoft}50`,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      alignSelf: 'center',
    },
    pulseDotOuter: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: `${c.mutedTeal}40`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseDotInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.mutedTeal,
    },
    pulseText: { fontSize: 11, color: c.mutedTeal, fontWeight: '500' },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginVertical: 12,
      gap: 10,
    },
    dateLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
    dateLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textMuted,
      backgroundColor: c.bgLight,
      paddingHorizontal: 8,
    },
    filterBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${c.primaryDark}12`,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${c.primaryDark}20`,
    },
    filterText: {
      fontSize: 12,
      color: c.primaryDark,
      fontWeight: '600',
    },
    loader: { marginTop: 40 },
    footerLoader: { paddingVertical: 16 },
    emptyText: {
      textAlign: 'center',
      color: c.textMuted,
      fontSize: 14,
      marginTop: 40,
    },
    listContent: { paddingBottom: 20 },
  });
}
