import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#121417",
  onSurface: "#F4F5F7",
  surfaceSecondary: "#1A1D23",
  onSurfaceSecondary: "#9CA3AF",
  surfaceTertiary: "#252A34",
  onSurfaceTertiary: "#D1D5DB",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#121417",
  muted: "#9CA3AF",
  brand: "#D97706",
  onBrand: "#121417",
  brandPrimary: "#F59E0B",
  onBrandPrimary: "#121417",
  brandSecondary: "#B45309",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "rgba(245, 158, 11, 0.15)",
  onBrandTertiary: "#F59E0B",
  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#121417",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",
  border: "#2A313C",
  borderStrong: "#4B5563",
  divider: "#1F242C",
  scrim: "rgba(0,0,0,0.62)",
  brandOverlay: "rgba(18,20,23,0.15)",
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