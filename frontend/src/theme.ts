import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

// TukangGaji Pro — "Dark-First Utility": gelap solid, aksen rust #E05A36.
const dark = {
  surface: "#121316",
  onSurface: "#F4F5F7",
  surfaceSecondary: "#1A1C21",
  onSurfaceSecondary: "#9CA3AF",
  surfaceTertiary: "#262932",
  onSurfaceTertiary: "#D1D5DB",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#121316",
  muted: "#6B7280",
  brand: "#E05A36",
  onBrand: "#FFFFFF",
  brandPrimary: "#E05A36",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#D97706",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "rgba(224, 90, 54, 0.15)",
  onBrandTertiary: "#E05A36",
  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#121316",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",
  border: "#2E333F",
  borderStrong: "#E05A36",
  divider: "#1F242E",
  scrim: "rgba(0,0,0,0.62)",
  brandOverlay: "rgba(255,255,255,0.16)",
};

export type ThemeColors = typeof dark;
export const defaultScheme = "dark" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light: dark, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme(null);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme() as ColorScheme | null;
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.dark ?? themes.light };
}

export function makeStyles(
  factory: (colors: ThemeColors) => Record<string, unknown>,
): () => any {
  return function useStyles(): any {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors) as StyleSheet.NamedStyles<any>), [colors]);
  };
}
