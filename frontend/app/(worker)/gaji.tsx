import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Banner, ChipRow, EmptyState, ScreenTitle } from "@/src/components/ui";
import { currentPeriod, fmtDateID, fmtHours, money, monthLabel, monthOf, periodDates, shiftMonth, todayISO } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";
import type { WorkerPayroll } from "@/src/types";

export default function WorkerGaji() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [month, setMonth] = useState(monthOf(todayISO()));
  const [period, setPeriod] = useState<1 | 2>(currentPeriod());
  const [data, setData] = useState<WorkerPayroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const periodOptions = [periodDates(month, 1).label, periodDates(month, 2).label];

  const load = useCallback(async () => {
    try {
      setError("");
      setData(await api.workerPayroll(month, period));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat gaji");
    } finally {
      setLoading(false);
    }
  }, [month, period]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerArea}>
        <ScreenTitle eyebrow="GAJI SAYA" title={monthLabel(month)} />
        <View style={styles.periodRow}>
          <Pressable testID="worker-pay-prev-month" onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthArrow}>
            <MaterialDesignIcons name="chevron-left" size={22} color={colors.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ChipRow testID="worker-pay-period" options={periodOptions} value={period === 1 ? periodOptions[0] : periodOptions[1]}
              onChange={(v) => setPeriod(v === periodOptions[0] ? 1 : 2)} />
          </View>
          <Pressable testID="worker-pay-next-month" onPress={() => setMonth(shiftMonth(month, 1))} style={styles.monthArrow}>
            <MaterialDesignIcons name="chevron-right" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {error ? <Banner testID="worker-pay-error" text={error} onClose={() => setError("")} /> : null}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brandPrimary} size="large" /><Text style={styles.muted}>Menghitung gaji...</Text></View>
      ) : !data ? (
        <EmptyState icon="cash-remove" title="Belum ada data" body="Data gaji periode ini belum tersedia." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brandPrimary} />}>
          <View style={styles.hero} testID="worker-gross-card">
            <Text style={styles.heroLabel}>TOTAL PERIODE {periodDates(month, period).label.toUpperCase()}</Text>
            <Text style={styles.heroValue}>{money(data.gross)}</Text>
            <Text style={styles.heroHint}>{data.days} hari kerja · {fmtHours(data.regular_hours)} reguler · {fmtHours(data.overtime_hours)} lembur</Text>
          </View>

          <View style={styles.splitRow}>
            <View style={styles.splitCard}>
              <MaterialDesignIcons name="hand-coin-outline" size={18} color={colors.success} />
              <Text style={[styles.splitValue, { color: colors.success }]}>{money(data.paid)}</Text>
              <Text style={styles.muted}>Sudah dibayar</Text>
            </View>
            <View style={styles.splitCard}>
              <MaterialDesignIcons name="wallet-outline" size={18} color={colors.warning} />
              <Text style={[styles.splitValue, { color: colors.warning }]}>{money(data.remaining)}</Text>
              <Text style={styles.muted}>Sisa belum dibayar</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>RINCIAN</Text>
            <View style={styles.detailRow}><Text style={styles.muted}>Upah reguler ({fmtHours(data.regular_hours)})</Text><Text style={styles.detailValue}>{money(data.base_pay)}</Text></View>
            <View style={styles.detailRow}><Text style={styles.muted}>Upah lembur ({fmtHours(data.overtime_hours)})</Text><Text style={styles.detailValue}>{money(data.overtime_pay)}</Text></View>
            <View style={[styles.detailRow, styles.detailTotal]}><Text style={styles.detailTotalLabel}>Total</Text><Text style={styles.detailTotalValue}>{money(data.gross)}</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Pembayaran diterima</Text>
          {data.payments.length === 0 ? (
            <Text style={styles.muted}>Belum ada pembayaran di periode ini.</Text>
          ) : (
            data.payments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow} testID={`worker-payment-${payment.id}`}>
                <View style={styles.paymentIcon}>
                  <MaterialDesignIcons name={payment.method === "mandor" ? "account-tie-outline" : "cash-fast"} size={18} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>{payment.method === "mandor" ? `Via mandor ${payment.mandor_name}` : "Dibayar langsung"}</Text>
                  <Text style={styles.muted}>{fmtDateID(payment.created_at.slice(0, 10))}{payment.note ? ` · ${payment.note}` : ""}</Text>
                </View>
                <Text style={styles.paymentAmount}>{money(payment.amount)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  headerArea: { paddingTop: 8, paddingHorizontal: 20, gap: 14 },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  monthArrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: colors.muted, fontSize: 12 },
  scroll: { padding: 20, gap: 14, paddingBottom: 32 },
  hero: { padding: 20, borderRadius: 16, backgroundColor: colors.brandPrimary },
  heroLabel: { color: colors.onBrandPrimary, opacity: 0.7, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroValue: { color: colors.onBrandPrimary, fontSize: 30, fontWeight: "900", marginTop: 4 },
  heroHint: { color: colors.onBrandPrimary, opacity: 0.8, fontSize: 12, marginTop: 4 },
  splitRow: { flexDirection: "row", gap: 10 },
  splitCard: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 5 },
  splitValue: { fontSize: 16, fontWeight: "900" },
  card: { padding: 16, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardLabel: { color: colors.brandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailValue: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  detailTotal: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 },
  detailTotalLabel: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  detailTotalValue: { color: colors.brandPrimary, fontSize: 15, fontWeight: "900" },
  sectionTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginTop: 4 },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  paymentIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  paymentTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  paymentAmount: { color: colors.success, fontSize: 13, fontWeight: "900" },
}));
