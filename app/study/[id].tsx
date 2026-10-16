// ============================================================
// Study screen — flip card, Easy / Medium / Hard ratings
// Light theme matching Cogni AI design mockup
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW } from '@/constants';
import { getStudySet, updateLastStudied } from '@/services/StorageService';
import type { StudySet, CardRating } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - SPACING.lg * 2;
const CARD_H = Math.round(CARD_W * 0.7);

export default function StudyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [ratings, setRatings] = useState<Record<CardRating, number>>({ easy: 0, medium: 0, hard: 0 });
  const [done, setDone] = useState(false);
  const startTime = useRef(Date.now());

  const flipProgress = useSharedValue(0);
  const cardX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  useEffect(() => {
    if (!id) return;
    getStudySet(id).then((s) => { if (s) setStudySet(s); });
  }, [id]);

  const currentCard = studySet?.cards[cardIndex];

  // ── Flip ────────────────────────────────────────────────────
  const flipCard = useCallback(() => {
    const newFlipped = !isFlipped;
    flipProgress.value = withTiming(newFlipped ? 1 : 0, { duration: 280 });
    setIsFlipped(newFlipped);
    if (newFlipped) setFlipCount((c) => c + 1);
  }, [isFlipped, flipProgress]);

  // ── Advance card ────────────────────────────────────────────
  const advanceCard = useCallback((rating?: CardRating) => {
    if (!studySet) return;
    if (rating) setRatings((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

    const next = cardIndex + 1;
    if (next >= studySet.cards.length) {
      updateLastStudied(studySet.id).catch(() => {});
      setDone(true);
      return;
    }

    if (Platform.OS === 'web') {
      setCardIndex(next);
      setIsFlipped(false);
      setFlipCount(0);
      flipProgress.value = 0;
      cardX.value = 0;
      cardOpacity.value = 1;
      return;
    }

    cardOpacity.value = withTiming(0, { duration: 140 }, () => {
      runOnJS(setCardIndex)(next);
      runOnJS(setIsFlipped)(false);
      runOnJS(setFlipCount)(0);
      flipProgress.value = 0;
      cardX.value = 30;
      cardOpacity.value = withTiming(1, { duration: 180 });
      cardX.value = withSpring(0, { damping: 22, stiffness: 220 });
    });
  }, [studySet, cardIndex, flipProgress, cardX, cardOpacity]);

  const prevCard = useCallback(() => {
    if (cardIndex === 0) return;
    if (Platform.OS === 'web') {
      setCardIndex(cardIndex - 1);
      setIsFlipped(false);
      setFlipCount(0);
      flipProgress.value = 0;
      cardX.value = 0;
      cardOpacity.value = 1;
      return;
    }
    cardOpacity.value = withTiming(0, { duration: 140 }, () => {
      runOnJS(setCardIndex)(cardIndex - 1);
      runOnJS(setIsFlipped)(false);
      runOnJS(setFlipCount)(0);
      flipProgress.value = 0;
      cardX.value = -30;
      cardOpacity.value = withTiming(1, { duration: 180 });
      cardX.value = withSpring(0);
    });
  }, [cardIndex, flipProgress, cardX, cardOpacity]);

  // ── Gestures ────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX < -60) runOnJS(advanceCard)();
      else if (e.translationX > 60) runOnJS(prevCard)();
    });

  const tapGesture = Gesture.Tap().onEnd(() => { runOnJS(flipCard)(); });
  const composed = Gesture.Race(panGesture, tapGesture);

  // ── Animated styles ─────────────────────────────────────────
  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` },
    ],
    opacity: flipProgress.value < 0.5 ? 1 : 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` },
    ],
    opacity: flipProgress.value >= 0.5 ? 1 : 0,
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
  }));

  const cardWrapperStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardX.value }],
  }));

  // ── Loading ─────────────────────────────────────────────────
  if (!studySet) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const total = studySet.cards.length;

  // ── Completion ──────────────────────────────────────────────
  if (done) {
    const secs = Math.round((Date.now() - startTime.current) / 1000);
    const totalRated = ratings.easy + ratings.medium + ratings.hard;
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="dark-content" />

        <Text style={styles.doneEmoji}>🎊</Text>
        <Text style={styles.doneTitle}>Session Complete!</Text>
        <Text style={styles.doneDeck} numberOfLines={1}>{studySet.title}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <DoneStat label="Easy" value={ratings.easy} color={COLORS.easy} emoji="😊" />
          <DoneStat label="Medium" value={ratings.medium} color={COLORS.medium} emoji="😐" />
          <DoneStat label="Hard" value={ratings.hard} color={COLORS.hard} emoji="😤" />
        </View>
        <Text style={styles.doneMeta}>
          {total} cards · {Math.floor(secs / 60)}m {secs % 60}s
        </Text>

        <TouchableOpacity
          onPress={() => {
            setCardIndex(0); setIsFlipped(false); setFlipCount(0);
            flipProgress.value = 0;
            setRatings({ easy: 0, medium: 0, hard: 0 }); setDone(false);
            startTime.current = Date.now();
          }}
          activeOpacity={0.85}
          style={styles.studyAgainBtn}
        >
          <Text style={styles.studyAgainText}>Study Again</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back to Library</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = (cardIndex + 1) / total;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-down" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{studySet.title}</Text>
          <Text style={styles.headerSub}>Card {cardIndex + 1} of {total}</Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Secondary row: flip counter + bookmark */}
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={flipCard} style={styles.subHeaderBtn} activeOpacity={0.7}>
          <Ionicons name="sync-outline" size={15} color={COLORS.primary} />
          <Text style={styles.subHeaderBtnText}>Flip ({flipCount}/{Math.max(flipCount, 1)})</Text>
        </TouchableOpacity>
        <Text style={styles.subHeaderProgress}>{cardIndex + 1}/{total}</Text>
        <TouchableOpacity
          onPress={() => setBookmarked((prev) => {
            const next = new Set(prev);
            next.has(cardIndex) ? next.delete(cardIndex) : next.add(cardIndex);
            return next;
          })}
          style={styles.subHeaderBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={bookmarked.has(cardIndex) ? 'bookmark' : 'bookmark-outline'}
            size={15}
            color={bookmarked.has(cardIndex) ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.subHeaderBtnText, { color: bookmarked.has(cardIndex) ? COLORS.primary : COLORS.textMuted }]}>
            Bookmark
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card */}
      <View style={styles.cardArea}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.cardWrapper, cardWrapperStyle]}>
            {/* Front */}
            <Animated.View style={[styles.card, frontStyle]}>
              <View style={styles.cardInner}>
                <Text style={styles.questionText}>{currentCard?.question}</Text>
              </View>
            </Animated.View>

            {/* Back */}
            <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
              <View style={styles.cardInner}>
                <View style={[styles.answerBadge, { backgroundColor: studySet.coverColor + '22' }]}>
                  <Text style={[styles.answerBadgeText, { color: studySet.coverColor }]}>Answer</Text>
                </View>
                <Text style={styles.answerText}>{currentCard?.answer}</Text>
                {currentCard?.hint ? (
                  <View style={styles.hintBox}>
                    <Ionicons name="bulb-outline" size={14} color={COLORS.medium} />
                    <Text style={styles.hintText}>{currentCard.hint}</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {!isFlipped && (
          <TouchableOpacity onPress={flipCard} style={styles.tapFlipRow} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={16} color={COLORS.textMuted} />
            <Text style={styles.tapFlipRowText}>Tap to Flip</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Rating / Nav buttons */}
      {isFlipped ? (
        <View style={[styles.ratingRow, { paddingBottom: insets.bottom + 16 }]}>
          <RatingBtn
            emoji="😊" label="Easy" color={COLORS.easy}
            bgColor={COLORS.easyLight} onPress={() => advanceCard('easy')}
          />
          <RatingBtn
            emoji="😐" label="Medium" color={COLORS.medium}
            bgColor={COLORS.mediumLight} onPress={() => advanceCard('medium')}
          />
          <RatingBtn
            emoji="😤" label="Hard" color={COLORS.hard}
            bgColor={COLORS.hardLight} onPress={() => advanceCard('hard')}
          />
        </View>
      ) : (
        <View style={[styles.navRow, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={prevCard}
            disabled={cardIndex === 0}
            style={[styles.navBtn, cardIndex === 0 && styles.navBtnDisabled]}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={cardIndex === 0 ? COLORS.textMuted : COLORS.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.navHint}>Tap card to see answer</Text>

          <TouchableOpacity
            onPress={() => advanceCard()}
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Small components ─────────────────────────────────────────

function RatingBtn({
  emoji, label, color, bgColor, onPress,
}: {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.ratingBtn, { backgroundColor: bgColor, borderColor: color + '44' }]}
    >
      <Text style={styles.ratingEmoji}>{emoji}</Text>
      <Text style={[styles.ratingLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DoneStat({
  label, value, color, emoji,
}: {
  label: string; value: number; color: string; emoji: string;
}) {
  return (
    <View style={[styles.doneStat, { backgroundColor: color + '18', borderColor: color + '44' }]}>
      <Text style={styles.doneStatEmoji}>{emoji}</Text>
      <Text style={[styles.doneStatValue, { color }]}>{value}</Text>
      <Text style={styles.doneStatLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.textMuted, fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: '#fff',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgApp, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.sm },
  headerTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },

  // Progress
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.bgApp,
    marginHorizontal: SPACING.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
  },
  subHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  subHeaderBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  subHeaderProgress: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  // Card
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  cardWrapper: { width: CARD_W, height: CARD_H },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardBack: {
    backgroundColor: '#F8F9FF',
    borderColor: COLORS.primaryLight + '44',
  },
  cardInner: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  questionText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
    flex: 1,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  tapFlipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  tapFlipRowText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  answerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  answerBadgeText: { fontSize: 12, fontWeight: '700' },
  answerText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
    flex: 1,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.mediumLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  hintText: { color: COLORS.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 },
  // Rating buttons
  ratingRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: 10,
    paddingTop: SPACING.sm,
  },
  ratingBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: BORDER_RADIUS.xxl,
    borderWidth: 1.5,
    gap: 4,
  },
  ratingEmoji: { fontSize: 28 },
  ratingLabel: { fontSize: 14, fontWeight: '700' },

  // Nav
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: 12,
    paddingTop: SPACING.sm,
  },
  navBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.bgApp, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  navBtnDisabled: { opacity: 0.3 },
  navHint: { flex: 1, textAlign: 'center', color: COLORS.textMuted, fontSize: 12 },

  // Done screen
  doneEmoji: { fontSize: 72, marginBottom: SPACING.md },
  doneTitle: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '900', marginBottom: 4 },
  doneDeck: {
    color: COLORS.textSecondary, fontSize: 15, marginBottom: SPACING.xl,
    maxWidth: CARD_W, textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: SPACING.md },
  doneStat: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: BORDER_RADIUS.xl, alignItems: 'center',
    borderWidth: 1.5, gap: 2, minWidth: 82,
  },
  doneStatEmoji: { fontSize: 24 },
  doneStatValue: { fontSize: 22, fontWeight: '800' },
  doneStatLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  doneMeta: { color: COLORS.textMuted, fontSize: 13, marginBottom: SPACING.xl },
  studyAgainBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full,
    paddingVertical: 16, paddingHorizontal: 48,
    width: CARD_W, alignItems: 'center', marginBottom: SPACING.md,
    ...SHADOW.md,
  },
  studyAgainText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { paddingVertical: 12 },
  backLinkText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
