// ============================================================
// StudySetCard — card for Library + Home (light theme)
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SPACING, SHADOW } from '../constants';
import type { StudySet } from '../types';

interface StudySetCardProps {
  studySet: StudySet;
  onPress: () => void;
  onDelete?: () => void;
}

export function StudySetCard({ studySet, onPress, onDelete }: StudySetCardProps) {
  const handleLongPress = () => {
    if (!onDelete) return;
    Alert.alert(
      'Delete Study Set',
      `Delete "${studySet.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
      style={styles.card}
    >
      {/* Color accent strip */}
      <View style={[styles.accent, { backgroundColor: studySet.coverColor }]} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={2}>{studySet.title}</Text>
          {studySet.description ? (
            <Text style={styles.description} numberOfLines={1}>{studySet.description}</Text>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <View style={styles.meta}>
            <Ionicons name="layers-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{studySet.cards.length} cards</Text>
          </View>
          {studySet.lastStudiedAt ? (
            <View style={styles.meta}>
              <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{formatRelative(studySet.lastStudiedAt)}</Text>
            </View>
          ) : (
            <Text style={styles.notStudied}>Not studied yet</Text>
          )}
        </View>
      </View>

      {/* Play button */}
      <View style={[styles.playBtn, { backgroundColor: studySet.coverColor + '18' }]}>
        <Ionicons name="play" size={16} color={studySet.coverColor} />
      </View>
    </TouchableOpacity>
  );
}

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: 10,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  accent: { width: 5, alignSelf: 'stretch' },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    justifyContent: 'space-between',
  },
  top: { marginBottom: 8 },
  title: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  description: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  bottom: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: COLORS.textMuted, fontSize: 12 },
  notStudied: { color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic' },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
});
