import { Platform } from "react-native";

export const colors = {
  // Surfaces
  surface: "#F5F4F0",
  surface2: "#FFFFFF",
  surface3: "#EAE8E3",

  // Text
  text: "#1A1A18",
  textMuted: "#666666",
  textSubtle: "#888888",

  // Brand
  brand: "#D35400",
  brand2: "#E67E22",
  brandSoft: "#FCECD7",

  // Status Colors
  success: "#E8F5E9",
  onSuccess: "#2E7D32",

  warning: "#FFF3E0",
  onWarning: "#E65100",

  error: "#FFEBEE",
  onError: "#C62828",

  info: "#E8F0FE",
  onInfo: "#1A4DB5",

  // Borders
  border: "#EAE8E3",
  borderStrong: "#D5D2C9",

  // Status Pills
  pillBlue: "#E8F0FE",
  pillBlueText: "#1A4DB5",

  pillGreen: "#E6F4EA",
  pillGreenText: "#1A6B2E",

  pillYellow: "#FEF9E7",
  pillYellowText: "#7D5A00",

  pillRed: "#FCE8E6",
  pillRedText: "#A50E0E",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  pill: 999,
};

export const fonts = {
  display: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia",
  }) as string,

  body: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "System",
  }) as string,

  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }) as string,
};

export const type = {
  h1: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600" as const,
    color: colors.text,
  },

  h2: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
    color: colors.text,
  },

  h3: {
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
    color: colors.text,
  },

  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },

  bodyLg: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },

  small: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },

  label: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
};