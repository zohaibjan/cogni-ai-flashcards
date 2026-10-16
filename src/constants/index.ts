// ============================================================
// Cogni AI — Light theme constants (purple + blue palette)
// ============================================================

export const COLORS = {
  // Brand — purple primary
  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  primaryDark: '#6D28D9',
  primaryBg: 'rgba(124,58,237,0.10)',

  // Brand — blue secondary
  secondary: '#3B82F6',
  secondaryLight: '#60A5FA',
  secondaryBg: 'rgba(59,130,246,0.10)',

  // App backgrounds (light theme)
  bgApp: '#F5F5FF',
  bgCard: '#FFFFFF',
  bgInput: '#F3F4F6',
  bgTag: '#EDE9FE',

  // Text (dark on light)
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnColor: '#FFFFFF',

  // Borders & dividers
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.14)',

  // Study rating buttons
  easy: '#34C759',
  easyLight: 'rgba(52,199,89,0.12)',
  medium: '#FBBF24',
  mediumLight: 'rgba(251,191,36,0.12)',
  hard: '#EF4444',
  hardLight: 'rgba(239,68,68,0.12)',

  // Status
  success: '#34C759',
  warning: '#FBBF24',
  error: '#EF4444',
} as const;

export const GRADIENTS = {
  // Main brand gradient (purple → blue)
  brand: ['#7C3AED', '#3B82F6'] as const,

  // Action button gradients (2x2 grid on Home)
  captureNotes: ['#7C3AED', '#4F46E5'] as const,
  uploadPDF:    ['#A855F7', '#7C3AED'] as const,
  uploadImage:  ['#3B82F6', '#6366F1'] as const,
  uploadDoc:    ['#6366F1', '#8B5CF6'] as const,

  // Utility
  easy:   ['#34C759', '#28A745'] as const,
  medium: ['#FBBF24', '#F59E0B'] as const,
  hard:   ['#EF4444', '#DC2626'] as const,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
} as const;

// Vivid colors assigned to new study sets
export const DECK_COLORS = [
  '#7C3AED',  // purple
  '#3B82F6',  // blue
  '#10B981',  // emerald
  '#F59E0B',  // amber
  '#EF4444',  // red
  '#8B5CF6',  // violet
  '#06B6D4',  // cyan
  '#EC4899',  // pink
] as const;

export const GEMINI_API_KEY: string =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
