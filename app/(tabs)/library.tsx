// ============================================================
// Library screen — searchable list of study sets (light theme)
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING, BORDER_RADIUS, SHADOW } from '@/constants';
import { getStudySets, deleteStudySet } from '@/services/StorageService';
import { StudySetCard } from '@/components/StudySetCard';
import type { StudySet } from '@/types';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [query, setQuery] = useState('');

  const loadSets = useCallback(async () => {
    setStudySets(await getStudySets());
  }, []);

  useFocusEffect(useCallback(() => { loadSets(); }, [loadSets]));

  const filtered = studySets.filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    await deleteStudySet(id);
    setStudySets((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Library</Text>
            <Text style={styles.subtitle}>
              {studySets.length === 0
                ? 'No sets yet'
                : `${studySets.length} study set${studySets.length !== 1 ? 's' : ''}`}
            </Text>

            {studySets.length > 0 && (
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search sets..."
                  placeholderTextColor={COLORS.textMuted}
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {query.length > 0 ? (
              <>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No results for "{query}"</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyEmoji}>📚</Text>
                <Text style={styles.emptyTitle}>Library is empty</Text>
                <Text style={styles.emptySub}>
                  Generate your first set from photos, PDFs, or documents.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/generate')}
                  activeOpacity={0.85}
                  style={styles.createBtn}
                >
                  <LinearGradient
                    colors={[...GRADIENTS.brand]}
                    style={styles.createBtnGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.createBtnText}>Create Study Set</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <StudySetCard
            studySet={item}
            onPress={() => router.push(`/study/${item.id}`)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgApp },
  list: { paddingHorizontal: SPACING.lg },
  title: {
    color: COLORS.textPrimary, fontSize: 30, fontWeight: '900',
    letterSpacing: -0.5, marginBottom: 4,
  },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginBottom: SPACING.lg },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 46, gap: 8,
    marginBottom: SPACING.md, ...SHADOW.sm,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 15, height: '100%' },

  empty: { alignItems: 'center', paddingTop: 48 },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING.md },
  emptyTitle: {
    color: COLORS.textPrimary, fontSize: 20, fontWeight: '700',
    marginBottom: 8, textAlign: 'center',
  },
  emptySub: {
    color: COLORS.textSecondary, fontSize: 14, textAlign: 'center',
    lineHeight: 20, marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  createBtn: { borderRadius: BORDER_RADIUS.full, overflow: 'hidden', ...SHADOW.md },
  createBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
