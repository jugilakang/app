import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Banner, EmptyState, ScreenTitle } from "@/src/components/ui";
import { fmtDateID, fmtHours, money, monthLabel, monthOf, shiftMonth, todayISO } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";
import type { DayStatus, WorkerAttendance } from "@/src/types";

const STATUS_LABEL: Record<DayStatus, string> = { belum: "Belum", masuk: "Masuk", istirahat: "Istirahat", lembur: "Lembur", pulang: "Pulang" };

export default function WorkerAbsensi() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [month, setMonth] = useState(monthOf(todayISO()));
  const [data, setData] = useState<WorkerAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setData(await api.workerAttendance(month));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat absensi");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  const statusColor = (s: DayStatus) =>
    s === "pulang" ? colors.info : s === "lembur" ? colors.brandSecondary : s === "istirahat" ? colors.warning : s === "masuk" ? colors.success : colors.muted;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerArea}>
        <ScreenTitle eyebrow="RIWAYAT SAYA" title="Absensi" />
        <View style={styles.monthRow}>
          <Pressable testID="worker-att-prev-month" onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthArrow}>
            <MaterialDesignIcons name="chevron-left" size={22} color={colors.onSurface} />
          </Pressable>
          <View style={styles.monthLabel}><Text style={styles.monthText}>{monthLabel(month)}</Text></View>
          <Pressable testID="worker-att-next-month" onPress={() => setMonth(shiftMonth(month, 1))} style={styles.monthArrow}>
            <MaterialDesignIcons name="chevron-right" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {error ? <Banner testID="worker-att-error" text={error} onClose={() => setError("")} /> : null}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brandPrimary} size="large" /><Text style={styles.muted}>Memuat riwayat...</Text></View>
      ) : !data || data.rows.length === 0 ? (
        <EmptyState icon="calendar-blank-outline" title="Belum ada catatan" body="Riwayat absensi kamu bulan ini masih kosong." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brandPrimary} />}>
          {data.rows.map((row) => (
            <View key={row.record.id} style={styles.card} testID={`worker-att-row-${row.record.date}`}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dateText}>{fmtDateID(row.record.date)}</Text>
                  <Text style={styles.muted}>
                    {row.record.masuk_at ?? "--:--"} – {row.record.pulang_at ?? "--:--"}
                    {row.record.no_rest_siang ? " · tanpa istirahat siang" : ""}
                    {row.record.no_rest_sore ? " · tanpa istirahat sore" : ""}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor(row.status) }]}>
                  <Text style={styles.statusText}>{STATUS_LABEL[row.status]}</Text>
                </View>
              </View>
              {row.calc ? (
                <View style={styles.calcRow}>
                  <Text style={styles.calcMeta}>
                    {fmtHours(row.calc.regular_hours)} reguler{row.calc.lembur_hours > 0 ? ` + ${fmtHours(row.calc.lembur_hours)} lembur` : ""}
                  </Text>
                  <Text style={styles.calcTotal}>{money(row.calc.total)}</Text>
                </View>
              ) : null}
              {row.record.lembur_note ? <Text style={styles.note}>Catatan lembur: {row.record.lembur_note}</Text> : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  headerArea: { paddingTop: 8, paddingHorizontal: 20, gap: 14 },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthArrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  monthLabel: { flex: 1, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  monthText: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: colors.muted, fontSize: 12 },
  scroll: { padding: 20, gap: 12, paddingBottom: 32 },
  card: { padding: 14, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateText: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800" },
  calcRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calcMeta: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  calcTotal: { color: colors.brandPrimary, fontSize: 14, fontWeight: "900" },
  note: { color: colors.brandSecondary, fontSize: 11 },
}));
