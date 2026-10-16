// ============================================================
// Card — clean dark card OR vivid gradient card
// ============================================================

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BORDER_RADIUS, COLORS } from '../../constants';

interface GlassCardProps {
  children: React.ReactNode;
  /** Outer wrapper styles — margin, flex, width, position */
  style?: ViewStyle;
  /** Inner content styles — padding, alignItems, flexDirection, gap */
  contentStyle?: ViewStyle;
  gradient?: readonly [string, string, ...string[]];
  borderRadius?: number;
}

export default function GlassCard({
  children,
  style,
  contentStyle,
  gradient,
  borderRadius = BORDER_RADIUS.lg,
}: GlassCardProps) {
  if (gradient) {
    return (
      <View style={[styles.vivid, { borderRadius }, style]}>
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.inner, { borderRadius }, contentStyle]}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.dark, { borderRadius }, style]}>
      <View style={[styles.inner, { borderRadius, backgroundColor: COLORS.bgCard }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vivid: {
    overflow: 'hidden',
    borderWidth: 0,
  },
  dark: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inner: {
    padding: 16,
  },
});
