// ─── Khaali Design Tokens ─────────────────────────────────────────────────────
// Dark-first. Warm amber accent. Feels like a quiet room at night.

export const colors = {
  // Backgrounds
  bg: '#0A0A0F',          // near-black — primary background
  bgCard: '#12121A',      // lifted card surface
  bgInput: '#1A1A26',     // input field background
  bgModal: '#0E0E18',     // modal / sheet background

  // Borders & dividers
  border: '#2A2A3F',
  borderLight: '#1E1E2E',

  // Accent — warm amber/gold, not clinical, not corporate
  accent: '#C9A84C',
  accentDim: '#9A7B34',
  accentSoft: 'rgba(201, 168, 76, 0.12)',

  // Text
  textPrimary: '#F0EDE8',   // off-white — soft, not harsh
  textSecondary: '#8A8599', // muted secondary
  textMuted: '#4A4760',     // very muted, hints only
  textHindi: '#E8E4DC',     // slightly warmer for Devanagari

  // Semantic
  danger: '#C0392B',
  dangerSoft: 'rgba(192, 57, 43, 0.12)',
  success: '#27AE60',
  successSoft: 'rgba(39, 174, 96, 0.12)',

  // Crisis screen — deliberately calmer, not alarming red
  crisis: '#8B6914',
  crisisBg: '#1A140A',

  // Pure
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const typography = {
  // Font families — loaded via expo-font
  serif: 'Lora',          // for the founder letter — emotional weight
  sans: 'Inter',          // all other UI

  // Scale
  xs: 11,
  sm: 13,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  xxl: 36,
  hero: 44,

  // Weight
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  accent: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
