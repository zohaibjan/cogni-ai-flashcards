// ============================================================
// FlashCard — animated flip card component
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SPACING, GRADIENTS } from '../constants';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - SPACING.lg * 2;
const CARD_H = CARD_W * 0.65;

interface FlashCardProps {
  question: string;
  answer: string;
  hint?: string;
  flipProgress: SharedValue<number>; // 0 = front, 1 = back
  onFlip: () => void;
  coverColor?: string;
}

export function FlashCard({
  question,
  answer,
  hint,
  flipProgress,
  onFlip,
  coverColor = COLORS.primary,
}: FlashCardProps) {
  // Front face (question) — visible when progress < 0.5
  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    const opacity = flipProgress.value < 0.5 ? 1 : 0;
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  // Back face (answer) — visible when progress >= 0.5
  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    const opacity = flipProgress.value >= 0.5 ? 1 : 0;
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    };
  });

  return (
    <Pressable
      onPress={onFlip}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel="Tap to flip flashcard"
    >
      {/* Front — Question */}
      <Animated.View style={[styles.card, styles.front, frontStyle]}>
        <View style={[styles.colorBar, { backgroundColor: coverColor }]} />
        <View style={styles.cardContent}>
          <Text style={styles.sideLabel}>QUESTION</Text>
          <Text style={styles.questionText}>{question}</Text>
          <View style={styles.tapHint}>
            <Ionicons name="finger-print-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.tapHintText}>Tap to reveal answer</Text>
          </View>
        </View>
      </Animated.View>

      {/* Back — Answer */}
      <Animated.View style={[styles.card, styles.back, backStyle]}>
        <LinearGradient
          colors={[coverColor, adjustColor(coverColor, -30)]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.cardContent}>
          <Text style={[styles.sideLabel, styles.sideLabelDark]}>ANSWER</Text>
          <Text style={styles.answerText}>{answer}</Text>
          {hint ? (
            <View style={styles.hintRow}>
              <Ionicons name="bulb-outline" size={14} color="rgba(0,0,0,0.5)" />
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** Darken a hex color by `amount` (0–255) */
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

const styles = StyleSheet.create({
  container: {
    width: CARD_W,
    height: CARD_H,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  front: {},
  back: {},
  colorBar: {
    height: 6,
    width: '100%',
  },
  cardContent: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  sideLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sideLabelDark: {
    color: 'rgba(0,0,0,0.45)',
  },
  questionText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    flex: 1,
    marginVertical: SPACING.sm,
  },
  answerText: {
    color: '#0D0D0D',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    flex: 1,
    marginVertical: SPACING.sm,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tapHintText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
  },
  hintText: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
});
