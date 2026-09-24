import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Avatar, Banner } from "@/src/components/ui";
import { currentPeriod, fmtDateID, fmtHours, money, monthLabel, monthOf, periodDates, todayISO } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";
import type { DayStatus, WorkerAttendance, WorkerPayroll } from "@/src/types";

const STATUS_LABEL: Record<DayStatus, string> = { belum: "Belum dicatat", masuk: "Masuk", istirahat: "Istirahat", lembur: "Lembur", pulang: "Pulang" };

export default function WorkerHome() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, logout, refreshWorker } = useAuth();
  const worker = session?.worker;

  const [attendance, setAttendance] = useState<WorkerAttendance | null>(null);
  const [payroll, setPayroll] = useState<WorkerPayroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const month = monthOf(todayISO());
  const period = currentPeriod();
  const periodInfo = periodDates(month, period);

  const load = useCallback(async () => {
    try {
      setError("");
      const [att, pay] = await Promise.all([api.workerAttendance(month), api.workerPayroll(month, period), refreshWorker()]);
      setAttendance(att);
      setPayroll(pay);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [month, period, refreshWorker]);

  useEffect(() => { void load(); }, [load]);

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const todayRow = attendance?.rows.find((row) => row.record.date === todayISO());
  const statusColor = (s: DayStatus) =>
    s === "pulang" ? colors.info : s === "lembur" ? colors.brandSecondary : s === "istirahat" ? colors.warning : s === "masuk" ? colors.success : colors.muted;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <Avatar name={worker?.name ?? "?"} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} testID="worker-name">{worker?.name ?? "Pekerja"}</Text>
            <Text style={styles.muted}>{worker?.code} · {worker?.group}</Text>
          </View>
        </View>
        <Pressable testID="worker-logout-button" onPress={doLogout} style={styles.logoutButton}>
          <MaterialDesignIcons name="logout" size={18} color={colors.onSurfaceSecondary} />
        </Pressable>
      </View>

      {error ? <Banner testID="worker-home-error" text={error} onClose={() => setError("")} /> : null}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brandPrimary} size="large" /><Text style={styles.muted}>Memuat data kamu...</Text></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brandPrimary} />}>
          <View style={styles.todayCard} testID="worker-today-card">
            <View style={styles.todayHeader}>
              <Text style={styles.cardLabel}>HARI INI · {fmtDateID(todayISO()).toUpperCase()}</Text>
              <View style={[styles.statusPill, { backgroundColor: statusColor(todayRow?.status ?? "belum") }]}>
                <Text style={styles.statusText}>{STATUS_LABEL[todayRow?.status ?? "belum"]}</Text>
              </View>
            </View>
            <View style={styles.todayTimes}>
              <View style={styles.timeBox}>
                <Text style={styles.muted}>Masuk</Text>
                <Text style={styles.timeValue}>{todayRow?.record.masuk_at ?? "--:--"}</Text>
              </View>
              <MaterialDesignIcons name="arrow-right" size={16} color={colors.muted} />
              <View style={styles.timeBox}>
                <Text style={styles.muted}>Pulang</Text>
                <Text style={styles.timeValue}>{todayRow?.record.pulang_at ?? "--:--"}</Text>
              </View>
              <View style={{ flex: 1 }} />
              {todayRow?.calc ? (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.muted}>Upah hari ini</Text>
                  <Text style={styles.todayPay}>{money(todayRow.calc.total)}</Text>
                </View>
              ) : null}
            </View>
            {todayRow?.record.lembur ? (
              <Text style={styles.lemburLine}>
                Lembur {fmtHours(todayRow.calc?.lembur_hours ?? 0)}{todayRow.record.lembur_note ? ` · ${todayRow.record.lembur_note}` : ""}
              </Text>
            ) : null}
          </View>

          <View style={styles.card} testID="worker-period-card">
            <Text style={styles.cardLabel}>PERIODE {periodInfo.label.toUpperCase()} · {monthLabel(month).toUpperCase()}</Text>
            <Text style={styles.periodGross}>{money(payroll?.gross ?? 0)}</Text>
            <View style={styles.periodGrid}>
              <View style={styles.periodItem}><Text style={styles.periodValue}>{payroll?.days ?? 0}</Text><Text style={styles.muted}>Hari penuh</Text></View>
              <View style={styles.periodItem}><Text style={styles.periodValue}>{payroll?.half_days ?? 0}</Text><Text style={styles.muted}>½ hari</Text></View>
              <View style={styles.periodItem}><Text style={styles.periodValue}>{fmtHours(payroll?.overtime_hours ?? 0)}</Text><Text style={styles.muted}>Jam lembur</Text></View>
            </View>
            <View style={styles.payLine}>
              <Text style={styles.muted}>Sudah dibayar: <Text style={{ color: colors.success, fontWeight: "800" }}>{money(payroll?.paid ?? 0)}</Text></Text>
              <Text style={styles.muted}>Sisa: <Text style={{ color: colors.warning, fontWeight: "800" }}>{money(payroll?.remaining ?? 0)}</Text></Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>TARIF KAMU</Text>
            <View style={styles.rateRow}>
              <MaterialDesignIcons name="calendar-check-outline" size={18} color={colors.brandPrimary} />
              <Text style={styles.rateText}>Harian {money(worker?.daily_rate ?? 0)} · ½ hari {money((worker?.daily_rate ?? 0) / 2)}</Text>
            </View>
            <View style={styles.rateRow}>
              <MaterialDesignIcons name="clock-plus-outline" size={18} color={colors.brandSecondary} />
              <Text style={styles.rateText}>Lembur {money(worker?.overtime_rate ?? 0)}/jam (mulai 18.00)</Text>
            </View>
            <Text style={styles.rateHint}>Gaji pokok dihitung per hari. Bonus tanpa istirahat (siang 11.30–12.30 dan sore 17.00–18.00, masing-masing +1 j) memakai tarif lembur per jam.</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  name: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  muted: { color: colors.muted, fontSize: 12 },
  logoutButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  todayCard: { padding: 16, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 12 },
  todayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { color: colors.brandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800" },
  todayTimes: { flexDirection: "row", alignItems: "center", gap: 14 },
  timeBox: { gap: 2 },
  timeValue: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  todayPay: { color: colors.brandPrimary, fontSize: 18, fontWeight: "900" },
  lemburLine: { color: colors.brandSecondary, fontSize: 12, fontWeight: "700" },
  card: { padding: 16, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 12 },
  periodGross: { color: colors.onSurface, fontSize: 30, fontWeight: "900" },
  periodGrid: { flexDirection: "row", gap: 8 },
  periodItem: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: colors.surfaceTertiary, gap: 2 },
  periodValue: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  payLine: { flexDirection: "row", justifyContent: "space-between" },
  rateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rateText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  rateHint: { color: colors.muted, fontSize: 11, lineHeight: 16 },
}));
