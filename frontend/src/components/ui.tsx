import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { initials } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";

export function ScreenTitle({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleLeft}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function EmptyState({ icon, title, body, compact }: { icon: string; title: string; body: string; compact?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, compact && { minHeight: 150 }]}>
      <View style={styles.emptyIcon}><MaterialDesignIcons name={icon as never} size={compact ? 24 : 30} color={colors.brandPrimary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const styles = useStyles();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33 }]}>{initials(name)}</Text>
    </View>
  );
}

export function Field({ label, testID, ...props }: TextInputProps & { label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput testID={testID} placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

export function PrimaryButton({ label, icon, onPress, disabled, tone = "brand", testID }: {
  label: string; icon?: string; onPress: () => void; disabled?: boolean; tone?: "brand" | "ghost" | "danger" | "success"; testID: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = tone === "brand" ? colors.brandPrimary : tone === "danger" ? colors.error : tone === "success" ? colors.success : colors.surfaceTertiary;
  const fg = tone === "ghost" ? colors.onSurface : tone === "success" || tone === "danger" || tone === "brand" ? colors.onBrandPrimary : colors.onSurface;
  return (
    <Pressable testID={testID} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: bg }, pressed && styles.pressed, disabled && { opacity: 0.5 }]}>
      {icon ? <MaterialDesignIcons name={icon as never} size={18} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Baris chip filter horizontal — chrome, bukan konten. Chip tidak pernah wrap. */
export function ChipRow({ options, value, onChange, testID }: { options: string[]; value: string; onChange: (v: string) => void; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable key={option} testID={`${testID}-${option.toLowerCase().replace(/\s+/g, "-")}`} onPress={() => onChange(option)}
            style={[styles.chip, active && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
            <Text style={[styles.chipText, active && { color: colors.onBrandPrimary }]}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Banner({ text, tone = "error", onClose, testID }: { text: string; tone?: "error" | "success" | "info"; onClose: () => void; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = tone === "error" ? colors.error : tone === "success" ? colors.success : colors.info;
  return (
    <View testID={testID} style={[styles.banner, { backgroundColor: bg }]}>
      <MaterialDesignIcons name={tone === "error" ? "alert-circle-outline" : "check-circle-outline"} size={18} color={colors.onError} />
      <Text style={styles.bannerText}>{text}</Text>
      <Pressable testID={`${testID}-close`} onPress={onClose} hitSlop={8}><MaterialDesignIcons name="close" size={16} color={colors.onError} /></Pressable>
    </View>
  );
}

export function Sheet({ visible, onClose, title, children, testID }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} testID={`${testID}-backdrop`} />
        <View style={styles.sheet} testID={testID}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable testID={`${testID}-close`} onPress={onClose} style={styles.sheetClose}><MaterialDesignIcons name="close" size={20} color={colors.onSurface} /></Pressable>
          </View>
          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bottomOffset={24}>
            {children}
            <View style={{ height: 24 }} />
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function Stat({ label, value, icon, color, testID }: { label: string; value: string | number; icon: string; color: string; testID: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat} testID={testID}>
      <MaterialDesignIcons name={icon as never} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  titleLeft: { flex: 1 },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.onSurface, fontSize: 26, lineHeight: 32, fontWeight: "800", marginTop: 4 },
  empty: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  emptyIcon: { width: 60, height: 60, alignItems: "center", justifyContent: "center", borderRadius: 30, backgroundColor: colors.brandTertiary },
  emptyTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 280 },
  avatar: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  avatarText: { color: colors.onBrandTertiary, fontWeight: "800" },
  field: { gap: 6, marginBottom: 12 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700" },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, color: colors.onSurface, backgroundColor: colors.surfaceTertiary, fontSize: 14 },
  button: { minHeight: 48, borderRadius: 10, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonText: { fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  chipRow: { gap: 8, paddingHorizontal: 20 },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  chipText: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "700" },
  banner: { marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  bannerText: { flex: 1, color: colors.onError, fontSize: 13 },
  sheetOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
  sheetBackdrop: { flex: 1 },
  sheet: { maxHeight: "88%", padding: 20, paddingBottom: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.surface },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  sheetClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  stat: { flex: 1, minHeight: 88, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surfaceSecondary, gap: 4 },
  statValue: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  statLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
}));
