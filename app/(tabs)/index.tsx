// ============================================================
// Home screen — 2x2 action grid + horizontal recent study sets
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, GRADIENTS, SPACING, BORDER_RADIUS, SHADOW } from '@/constants';
import { getStudySets } from '@/services/StorageService';
import type { StudySet } from '@/types';

const NAME_KEY = '@cogni_user_name';
const { width: SCREEN_W } = Dimensions.get('window');
const RECENT_CARD_W = 110;

const ACTION_BUTTONS = [
  {
    id: 'camera',
    label: 'Capture\nNotes',
    icon: 'camera' as const,
    gradient: GRADIENTS.captureNotes,
    route: '/generate' as const,
  },
  {
    id: 'pdf',
    label: 'Upload\nPDF',
    icon: 'document-text' as const,
    gradient: GRADIENTS.uploadPDF,
    route: '/generate' as const,
  },
  {
    id: 'image',
    label: 'Upload\nImage',
    icon: 'image' as const,
    gradient: GRADIENTS.uploadImage,
    route: '/generate' as const,
  },
  {
    id: 'doc',
    label: 'Upload\nDocument',
    icon: 'folder-open' as const,
    gradient: GRADIENTS.uploadDoc,
    route: '/generate' as const,
  },
] as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('');
  const [recentSets, setRecentSets] = useState<StudySet[]>([]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(NAME_KEY).then((n) => { if (n) setUserName(n); });
      getStudySets().then((sets) => setRecentSets(sets.slice(0, 6)));
    }, []),
  );

  const greeting = userName ? `Welcome, ${userName}!` : 'Welcome back!';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* App header */}
        <View style={styles.appHeader}>
          <View style={styles.appLogo}>
            <Text style={styles.appLogoEmoji}>🧠</Text>
          </View>
          <Text style={styles.appName}>Cogni AI</Text>
          <TouchableOpacity
            onPress={() => router.push('/library')}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>{greeting}</Text>

        {/* 2×2 Action grid */}
        <View style={styles.actionGrid}>
          {ACTION_BUTTONS.map((btn) => (
            <TouchableOpacity
              key={btn.id}
              onPress={() => router.push(btn.route)}
              activeOpacity={0.85}
              style={styles.actionCell}
            >
              <LinearGradient
                colors={[...btn.gradient]}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name={btn.icon} size={28} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>{btn.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent study sets */}
        {recentSets.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Study Sets</Text>
              <TouchableOpacity onPress={() => router.push('/library')} activeOpacity={0.7}>
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={recentSets}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
              ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push(`/study/${item.id}`)}
                  activeOpacity={0.8}
                  style={styles.recentCard}
                >
                  {/* Color accent top bar */}
                  <View style={[styles.recentTop, { backgroundColor: item.coverColor }]}>
                    <Ionicons name="book-outline" size={22} color="rgba(255,255,255,0.85)" />
                  </View>
                  <View style={styles.recentBody}>
                    <Text style={styles.recentTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.recentCount}>{item.cards.length} cards</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {/* Empty state */}
        {recentSets.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>No study sets yet</Text>
            <Text style={styles.emptySub}>
              Tap one of the buttons above to create your first set!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgApp },
  content: { paddingHorizontal: SPACING.lg },

  // App header
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 10,
  },
  appLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLogoEmoji: { fontSize: 22 },
  appName: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },

  // Greeting
  greeting: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: SPACING.lg,
    letterSpacing: -0.3,
  },

  // Action grid (2x2)
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: SPACING.xl,
  },
  actionCell: {
    width: (SCREEN_W - SPACING.lg * 2 - 14) / 2,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  actionGradient: {
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    minHeight: 150,
    justifyContent: 'space-between',
  },
  actionIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: SPACING.sm,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  sectionLink: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  // Recent cards (horizontal scroll)
  recentList: { paddingRight: SPACING.lg },
  recentCard: {
    width: RECENT_CARD_W,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  recentTop: {
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentBody: { padding: 10 },
  recentTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 4,
  },
  recentCount: { color: COLORS.textMuted, fontSize: 11 },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.md },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
