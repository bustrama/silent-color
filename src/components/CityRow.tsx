import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { AppColors } from '../hooks/useTheme';
import type { CityLabel } from '../types';

interface Props {
  city: CityLabel;
  selected: boolean;
  onToggle: (cityLabel: string) => void;
}

export function CityRow({ city, selected, onToggle }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const firstLetter = city.label.charAt(0);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onToggle(city.label)}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* City name */}
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {city.label}
      </Text>

      {/* Letter badge */}
      <View style={[styles.letterBadge, selected && styles.letterBadgeSelected]}>
        <Text style={[styles.letterText, selected && styles.letterTextSelected]}>
          {firstLetter}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.surfaceLight,
      gap: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: c.primaryDark,
      borderColor: c.primaryDark,
    },
    checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    label: {
      flex: 1,
      color: c.textMain,
      fontSize: 15,
      textAlign: 'right',
    },
    labelSelected: { fontWeight: '700', color: c.textMain },
    letterBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${c.border}80`,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    letterBadgeSelected: { backgroundColor: c.primaryDark },
    letterText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textMuted,
    },
    letterTextSelected: { color: '#fff' },
  });
}
