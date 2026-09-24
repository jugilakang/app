import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { Banner, Field, PrimaryButton } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

type Mode = "pekerja" | "admin";

export default function LoginScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginAdmin, loginWorker } = useAuth();

  const [mode, setMode] = useState<Mode>("pekerja");
  const [identity, setIdentity] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!identity.trim() || !secret.trim()) {
      setError(mode === "admin" ? "Isi username dan kata sandi" : "Isi kode pekerja dan PIN");
      return;
    }
    try {
      setBusy(true);
      setError("");
      if (mode === "admin") {
        await loginAdmin(identity.trim(), secret);
        router.replace("/(admin)");
      } else {
        await loginWorker(identity.trim(), secret);
        router.replace("/(worker)");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk, coba lagi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}><MaterialDesignIcons name="account-hard-hat" size={30} color={colors.onBrandPrimary} /></View>
          <Text style={styles.brand}>TukangGaji <Text style={{ color: colors.brandPrimary }}>PRO</Text></Text>
          <Text style={styles.tagline}>Absensi & gaji harian proyek, tanpa ribet.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.segment}>
            {(["pekerja", "admin"] as Mode[]).map((item) => {
              const active = mode === item;
              return (
                <Pressable key={item} testID={item === "admin" ? "login-admin-tab" : "login-worker-tab"}
                  onPress={() => { setMode(item); setError(""); setIdentity(""); setSecret(""); }}
                  style={[styles.segmentItem, active && styles.segmentActive]}>
                  <MaterialDesignIcons name={item === "admin" ? "shield-account-outline" : "account-hard-hat-outline"} size={18}
                    color={active ? colors.onBrandPrimary : colors.muted} />
                  <Text style={[styles.segmentText, active && { color: colors.onBrandPrimary }]}>{item === "admin" ? "Admin" : "Pekerja"}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Banner testID="login-error-banner" text={error} onClose={() => setError("")} /> : null}

          <Field
            testID="login-identity-input"
            label={mode === "admin" ? "USERNAME" : "KODE PEKERJA"}
            value={identity}
            onChangeText={setIdentity}
            placeholder={mode === "admin" ? "admin" : "Contoh: TG001"}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            testID="login-secret-input"
            label={mode === "admin" ? "KATA SANDI" : "PIN (4 DIGIT)"}
            value={secret}
            onChangeText={(v) => setSecret(mode === "pekerja" ? v.replace(/[^0-9]/g, "").slice(0, 4) : v)}
            placeholder={mode === "admin" ? "Kata sandi admin" : "••••"}
            secureTextEntry
            keyboardType={mode === "pekerja" ? "number-pad" : "default"}
            autoCapitalize="none"
          />
          <PrimaryButton testID="login-submit-button" label={busy ? "Memeriksa..." : mode === "admin" ? "Masuk sebagai Admin" : "Masuk sebagai Pekerja"}
            icon="arrow-right" onPress={submit} disabled={busy} />
          <Text style={styles.hint}>
            {mode === "admin" ? "Khusus pemilik proyek / mandor utama." : "Kode & PIN diberikan oleh admin proyek."}
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, gap: 24 },
  brandRow: { alignItems: "center", gap: 10 },
  brandIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandPrimary },
  brand: { color: colors.onSurface, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { color: colors.onSurfaceSecondary, fontSize: 13 },
  card: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18, gap: 4 },
  segment: { flexDirection: "row", gap: 8, marginBottom: 16 },
  segmentItem: { flex: 1, minHeight: 46, borderRadius: 10, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  segmentActive: { backgroundColor: colors.brandPrimary },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 12 },
}));
