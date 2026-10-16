// ============================================================
// GradientButton — Primary action button with gradient
// ============================================================

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, BORDER_RADIUS } from '../../constants';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  gradient?: readonly [string, string, ...string[]];
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

export default function GradientButton({
  title,
  onPress,
  gradient = GRADIENTS.brand,
  disabled = false,
  loading = false,
  style,
  size = 'md',
}: GradientButtonProps) {
  const heightMap = { sm: 40, md: 52, lg: 60 };
  const fontMap = { sm: 14, md: 16, lg: 18 };

  return (
    <TouchableOpacity
      testID="gradient-button-touchable"
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}
    >
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          { height: heightMap[size], borderRadius: BORDER_RADIUS.full },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.text, { fontSize: fontMap[size] }]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
