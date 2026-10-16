// ============================================================
// Settings screen
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW } from '@/constants';

const NAME_KEY = '@cogni_user_name';
const PRIVACY_URL = 'https://example.com/privacy';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(NAME_KEY).then((v) => { if (v) setName(v); });
    }, []),
  );

  const saveName = async () => {
    await AsyncStorage.setItem(NAME_KEY, name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your study sets. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['@cogni_study_sets', NAME_KEY]);
            setName('');
            Alert.alert('Done', 'All data cleared.');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Settings</Text>

        {/* Profile */}
        <Text style={styles.sectionLabel}>YOUR NAME</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.textMuted}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <TouchableOpacity
              onPress={saveName}
              disabled={!name.trim()}
              activeOpacity={0.7}
            >
              <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>
                {saved ? 'Saved ✓' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <SettingsRow icon="apps" label="Cogni AI" value="v1.0.0" />
          <View style={styles.divider} />
          <SettingsRow icon="sparkles" label="AI Model" value="Gemini 2.5 Flash" />
          <View style={styles.divider} />
          <SettingsRow icon="cloud-offline" label="Storage" value="On-device only" />
        </View>

        {/* Legal */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_URL)}
            activeOpacity={0.7}
            style={styles.row}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.rowLabel, { flex: 1 }]}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionLabel}>DATA</Text>
        <TouchableOpacity onPress={clearData} activeOpacity={0.8} style={styles.dangerCard}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={styles.dangerText}>Clear all study sets</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.error} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon, label, value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgApp },
  content: { paddingHorizontal: SPACING.lg },
  title: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 10,
  },
  nameInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    height: 24,
  },
  saveText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  saveTextDisabled: { color: COLORS.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '500' },
  rowValue: { color: COLORS.textSecondary, fontSize: 13 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.md + 18 + 12 },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.20)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  dangerText: { color: COLORS.error, fontSize: 14, fontWeight: '600' },
});
