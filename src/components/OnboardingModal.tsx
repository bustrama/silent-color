import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { usePreferencesContext } from '../context/PreferencesContext';

export function OnboardingModal() {
  const { colors } = useTheme();
  const { prefs, setOnboardingDone } = usePreferencesContext();
  const router = useRouter();

  // Show only on first launch (after prefs loaded, before onboardingDone is set)
  const visible = !prefs.onboardingDone;

  const handleSelectCities = () => {
    setOnboardingDone();
    router.push('/(tabs)/settings');
  };

  const handleSkip = () => {
    setOnboardingDone();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.bgLight }]}>
          {/* Icon */}
          <Text style={styles.emoji}>🛡️</Text>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textMain }]}>
            ברוך הבא לצבע שקט
          </Text>

          {/* Body */}
          <Text style={[styles.body, { color: colors.textMuted }]}>
            האפליקציה מתריעה על אירועי ביטחון בזמן אמת.{'\n'}
            כדי לקבל התרעות רק עבור האזור שלך, בחר את הישובים הרלוונטיים.
          </Text>

          {/* Feature hints */}
          <View style={[styles.hintBox, { backgroundColor: `${colors.primaryDark}10`, borderColor: `${colors.primaryDark}25` }]}>
            <Text style={[styles.hintRow, { color: colors.textMain }]}>📍 סינון לפי ישוב ספציפי</Text>
            <Text style={[styles.hintRow, { color: colors.textMain }]}>🔔 התראות לפי סוג האירוע</Text>
            <Text style={[styles.hintRow, { color: colors.textMain }]}>🗺️ מפה חיה בזמן אמת</Text>
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primaryDark }]}
            onPress={handleSelectCities}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>בחר ישובים →</Text>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.6}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>
              המשך ללא סינון
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  emoji: { fontSize: 52, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  hintBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  hintRow: { fontSize: 14, fontWeight: '500', textAlign: 'right' },
  primaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipText: { fontSize: 13, fontWeight: '500', paddingVertical: 4 },
});
