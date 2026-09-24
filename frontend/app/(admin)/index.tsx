import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Avatar, Banner, EmptyState, ScreenTitle, Stat } from "@/src/components/ui";
import { fmtDateID, money, todayISO } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";
import type { AttendanceRow, Dashboard, DayStatus } from "@/src/types";

const STATUS_LABEL: Record<DayStatus, string> = { belum: "Belum hadir", masuk: "Masuk", istirahat: "Istirahat", lembur: "Lembur", pulang: "Pulang" };

export default function AdminDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [activity, setActivity] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [dash, att] = await Promise.all([api.dashboard(todayISO()), api.attendance(todayISO())]);
      setDashboard(dash);
      setActivity(att.rows.filter((row) => row.record));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat dasbor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const statusColor = (s: DayStatus) =>
    s === "pulang" ? colors.info : s === "lembur" ? colors.brandSecondary : s === "istirahat" ? colors.warning : s === "masuk" ? colors.success : colors.muted;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Mandor<Text style={{ color: colors.brandPrimary }}>App</Text></Text>
          <Text style={{ color: colors.brandPrimary, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 }}>Powered by Lilik Jr</Text>
          <Text style={styles.caption}>{fmtDateID(todayISO())}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.adminPill}>
            <MaterialDesignIcons name="shield-account-outline" size={15} color={colors.brandPrimary} />
            <Text style={styles.adminText}>ADMIN</Text>
          </View>
          <Pressable testID="admin-logout-button" onPress={doLogout} style={styles.logoutButton}>
            <MaterialDesignIcons name="logout" size={18} color={colors.onSurfaceSecondary} />
          </Pressable>
        </View>
      </View>

      {error ? <Banner testID="dashboard-error" text={error} onClose={() => setError("")} /> : null}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brandPrimary} size="large" /><Text style={styles.muted}>Memuat dasbor...</Text></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brandPrimary} />}>
          <ScreenTitle eyebrow="RINGKASAN HARI INI" title="Dasbor lapangan" />

          <View style={styles.hero}>
            <View>
              <Text style={styles.heroLabel}>ESTIMASI UPAH HARI INI</Text>
              <Text style={styles.heroValue} testID="dashboard-est-pay">{money(dashboard?.est_pay_today ?? 0)}</Text>
              <Text style={styles.heroHint}>Termasuk lembur per jam</Text>
            </View>
            <View style={styles.heroIcon}><MaterialDesignIcons name="cash-clock" size={28} color={colors.onBrandPrimary} /></View>
          </View>

          <View style={styles.statsRow}>
            <Stat testID="stat-workers" label="PEKERJA" value={dashboard?.active_workers ?? 0} icon="account-hard-hat" color={colors.info} />
            <Stat testID="stat-present" label="HADIR" value={dashboard?.present ?? 0} icon="check-circle-outline" color={colors.success} />
            <Stat testID="stat-lembur" label="LEMBUR" value={dashboard?.lembur ?? 0} icon="clock-plus-outline" color={colors.brandSecondary} />
            <Stat testID="stat-absent" label="BELUM" value={dashboard?.absent ?? 0} icon="account-off-outline" color={colors.error} />
          </View>

          {dashboard && dashboard.groups.some((g) => g.total > 0) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kehadiran per grup</Text>
              <View style={styles.groupGrid}>
                {dashboard.groups.filter((g) => g.total > 0).map((g) => (
                  <View key={g.group} style={styles.groupChip} testID={`dashboard-group-${g.group.toLowerCase()}`}>
                    <Text style={styles.groupName}>{g.group}</Text>
                    <Text style={styles.groupCount}>{g.present}/{g.total} hadir</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable testID="dashboard-goto-absensi" onPress={() => router.push("/(admin)/absensi")} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.8 }]}>
              <MaterialDesignIcons name="clipboard-check-outline" size={22} color={colors.brandPrimary} />
              <Text style={styles.actionTitle}>Catat absensi</Text>
              <Text style={styles.actionBody}>Tap masuk, istirahat, lembur, pulang</Text>
            </Pressable>
            <Pressable testID="dashboard-goto-gaji" onPress={() => router.push("/(admin)/gaji")} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.8 }]}>
              <MaterialDesignIcons name="cash-multiple" size={22} color={colors.brandPrimary} />
              <Text style={styles.actionTitle}>Rekap gaji</Text>
              <Text style={styles.actionBody}>Periode 1–15 & 16–akhir bulan</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktivitas hari ini</Text>
            {activity.length === 0 ? (
              <EmptyState compact icon="clipboard-text-clock-outline" title="Belum ada absensi" body="Catat kehadiran pekerja dari tab Absensi." />
            ) : (
              <View style={styles.card}>
                {activity.slice(0, 8).map((row) => (
                  <View key={row.worker.id} style={styles.feedRow}>
                    <Avatar name={row.worker.name} size={38} />
                    <View style={styles.feedInfo}>
                      <Text style={styles.feedName}>{row.worker.name}</Text>
                      <Text style={styles.muted}>
                        {row.record?.masuk_at ? `Masuk ${row.record.masuk_at}` : "Belum masuk"}{row.record?.pulang_at ? ` · Pulang ${row.record.pulang_at}` : ""}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusColor(row.status) }]}>
                      <Text style={styles.statusText}>{STATUS_LABEL[row.status]}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  brand: { color: colors.onSurface, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  caption: { color: colors.muted, fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  adminPill: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.brandTertiary },
  adminText: { color: colors.onBrandTertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  logoutButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: colors.muted, fontSize: 12 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  hero: { backgroundColor: colors.brandPrimary, borderRadius: 16, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { color: colors.onBrandPrimary, opacity: 0.7, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroValue: { color: colors.onBrandPrimary, fontSize: 28, fontWeight: "900", marginTop: 4 },
  heroHint: { color: colors.onBrandPrimary, opacity: 0.75, fontSize: 12, marginTop: 3 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandOverlay },
  statsRow: { flexDirection: "row", gap: 8 },
  section: { gap: 10 },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  groupGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  groupChip: { flexGrow: 1, minWidth: "30%", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  groupName: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  groupCount: { color: colors.muted, fontSize: 11, marginTop: 3 },
  actions: { flexDirection: "row", gap: 10 },
  actionCard: { flex: 1, gap: 6, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  actionTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  actionBody: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  feedRow: { minHeight: 62, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 10 },
  feedInfo: { flex: 1 },
  feedName: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statusText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800" },
}));
