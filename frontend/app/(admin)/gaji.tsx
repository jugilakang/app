import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, downloadExport } from "@/src/api";
import { Banner, ChipRow, EmptyState, Field, PrimaryButton, ScreenTitle, Sheet } from "@/src/components/ui";
import { currentPeriod, fmtHours, money, monthLabel, monthOf, periodDates, shiftMonth, todayISO } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";
import type { Payment, Payroll } from "@/src/types";

const GROUP_FILTERS = ["Semua", "Teknisi", "Besi", "Kayu", "Finishing", "Tukang", "Kuli"];

export default function GajiScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const [month, setMonth] = useState(monthOf(todayISO()));
  const [period, setPeriod] = useState<1 | 2>(currentPeriod());
  const [group, setGroup] = useState("Semua");
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [payOpen, setPayOpen] = useState(false);
  const [payError, setPayError] = useState("");
  const [method, setMethod] = useState<"mandor" | "langsung">("mandor");
  const [mandorName, setMandorName] = useState("");
  const [note, setNote] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const periodInfo = periodDates(month, period);
  const periodOptions = [periodDates(month, 1).label, periodDates(month, 2).label];

  const load = useCallback(async () => {
    try {
      const [p, pays] = await Promise.all([api.payroll(month, period, group), api.payments(month, period)]);
      setPayroll(p);
      setPayments(pays);
    } catch (err) {
      setBanner({ text: err instanceof Error ? err.message : "Gagal menghitung gaji", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [month, period, group]);

  useEffect(() => { setLoading(true); setSelected({}); void load(); }, [load]);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedRows = payroll?.rows.filter((row) => selected[row.worker_id]) ?? [];
  const selectedRemaining = selectedRows.reduce((sum, row) => sum + row.remaining, 0);

  const toggleSelect = (id: string) => setSelected((cur) => ({ ...cur, [id]: !cur[id] }));

  const openPay = () => {
    const initial: Record<string, string> = {};
    for (const row of selectedRows) initial[row.worker_id] = String(row.remaining);
    setAmounts(initial);
    setMethod("mandor");
    setMandorName("");
    setNote("");
    setPayError("");
    setPayOpen(true);
  };

  const submitPayment = async () => {
    const items = selectedIds.map((id) => ({ worker_id: id, amount: Number(amounts[id] || "0") }));
    if (items.some((item) => item.amount <= 0)) {
      setPayError("Isi jumlah pembayaran untuk setiap pekerja");
      return;
    }
    try {
      setBusy(true);
      setPayError("");
      await api.createPayment({ month, period, method, mandor_name: mandorName.trim(), note: note.trim(), items });
      setPayOpen(false);
      setSelected({});
      setBanner({ text: method === "mandor" ? `Pembayaran via mandor ${mandorName.trim()} tercatat` : "Pembayaran langsung tercatat", tone: "success" });
      await load();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Gagal mencatat pembayaran");
    } finally {
      setBusy(false);
    }
  };

  const removePayment = async (payment: Payment) => {
    try {
      setBanner(null);
      await api.deletePayment(payment.id);
      setBanner({ text: "Catatan pembayaran dihapus", tone: "success" });
      await load();
    } catch (err) {
      setBanner({ text: err instanceof Error ? err.message : "Gagal menghapus pembayaran", tone: "error" });
    }
  };

  const doExport = async (kind: "payroll" | "attendance") => {
    try {
      setBusy(true);
      await downloadExport(kind, { month, period, group });
    } catch (err) {
      setBanner({ text: err instanceof Error ? err.message : "Gagal mengekspor Excel", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerArea}>
        <ScreenTitle eyebrow={`GAJI 2 MINGGUAN · ${monthLabel(month).toUpperCase()}`} title="Rekap & bayar" />
        <View style={styles.periodRow}>
          <Pressable testID="payroll-prev-month" onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthArrow}>
            <MaterialDesignIcons name="chevron-left" size={22} color={colors.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ChipRow testID="payroll-period" options={periodOptions} value={period === 1 ? periodOptions[0] : periodOptions[1]}
              onChange={(v) => setPeriod(v === periodOptions[0] ? 1 : 2)} />
          </View>
          <Pressable testID="payroll-next-month" onPress={() => setMonth(shiftMonth(month, 1))} style={styles.monthArrow}>
            <MaterialDesignIcons name="chevron-right" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        <ChipRow testID="payroll-group-filter" options={GROUP_FILTERS} value={group} onChange={setGroup} />
      </View>

      {banner ? <Banner testID="payroll-banner" text={banner.text} tone={banner.tone} onClose={() => setBanner(null)} /> : null}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brandPrimary} size="large" /><Text style={styles.muted}>Menghitung jam & tarif...</Text></View>
      ) : !payroll ? (
        <EmptyState icon="cash-remove" title="Belum ada rekap" body="Rekap muncul setelah ada absensi di periode ini." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, selectedIds.length > 0 && { paddingBottom: 120 }]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brandPrimary} />}>
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL GAJI</Text>
              <Text style={styles.summaryValue} testID="payroll-total-gross">{money(payroll.total_gross)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TERBAYAR</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]} testID="payroll-total-paid">{money(payroll.total_paid)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>SISA</Text>
              <Text style={[styles.summaryValue, { color: colors.warning }]} testID="payroll-total-remaining">{money(payroll.total_remaining)}</Text>
            </View>
          </View>

          <View style={styles.exportRow}>
            <View style={{ flex: 1 }}>
              <PrimaryButton testID="export-payroll-button" label="Excel Gaji" icon="file-excel-outline" tone="ghost" disabled={busy} onPress={() => doExport("payroll")} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton testID="export-attendance-button" label="Excel Absensi" icon="file-excel-outline" tone="ghost" disabled={busy} onPress={() => doExport("attendance")} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Per pekerja · {periodInfo.label}</Text>
          {payroll.rows.length === 0 ? (
            <EmptyState compact icon="account-off-outline" title="Tidak ada pekerja" body="Belum ada pekerja pada filter grup ini." />
          ) : (
            payroll.rows.map((row) => {
              const isSelected = !!selected[row.worker_id];
              return (
                <Pressable key={row.worker_id} testID={`payroll-row-${row.worker_id}`} onPress={() => toggleSelect(row.worker_id)}
                  style={[styles.row, isSelected && { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary }]}>
                  <MaterialDesignIcons name={isSelected ? "check-circle" : "circle-outline"} size={22}
                    color={isSelected ? colors.brandPrimary : colors.muted} />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{row.name}</Text>
                    <Text style={styles.muted}>{row.code} · {row.group}</Text>
                    <Text style={styles.rowMeta}>{row.days} hari · {fmtHours(row.regular_hours)} + {fmtHours(row.overtime_hours)} lembur</Text>
                  </View>
                  <View style={styles.rowAmounts}>
                    <Text style={styles.rowGross}>{money(row.gross)}</Text>
                    <Text style={[styles.rowRemaining, { color: row.remaining > 0 ? colors.warning : colors.success }]}>
                      {row.remaining > 0 ? `Sisa ${money(row.remaining)}` : "Lunas"}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}

          <Text style={styles.sectionTitle}>Riwayat pembayaran</Text>
          {payments.length === 0 ? (
            <Text style={styles.muted}>Belum ada pembayaran di periode ini.</Text>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard} testID={`payment-card-${payment.id}`}>
                <View style={styles.paymentIcon}>
                  <MaterialDesignIcons name={payment.method === "mandor" ? "account-tie-outline" : "cash-fast"} size={20} color={colors.brandPrimary} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{payment.method === "mandor" ? `Via Mandor · ${payment.mandor_name}` : "Pembayaran langsung"}</Text>
                  <Text style={styles.muted}>
                    {payment.splits.length} pekerja · {payment.splits.map((s) => s.worker_name).join(", ")}
                  </Text>
                  {payment.note ? <Text style={styles.muted}>Catatan: {payment.note}</Text> : null}
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.rowGross}>{money(payment.total)}</Text>
                  <Pressable testID={`payment-delete-${payment.id}`} onPress={() => removePayment(payment)} hitSlop={8}>
                    <MaterialDesignIcons name="trash-can-outline" size={17} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {selectedIds.length > 0 && !payOpen ? (
        <View style={[styles.payBar, { bottom: bottomChrome + 16 }]} testID="payroll-action-bar">
          <View style={{ flex: 1 }}>
            <Text style={styles.payBarLabel}>{selectedIds.length} pekerja dipilih</Text>
            <Text style={styles.payBarValue}>{money(selectedRemaining)}</Text>
          </View>
          <PrimaryButton testID="payroll-pay-button" label="Bayar" icon="cash-check" onPress={openPay} />
        </View>
      ) : null}

      <Sheet testID="payment-sheet" visible={payOpen} onClose={() => { setPayOpen(false); setPayError(""); }} title="Catat pembayaran">
        {payError ? <Banner testID="payment-form-error" text={payError} onClose={() => setPayError("")} /> : null}
        <Text style={styles.formLabel}>METODE</Text>
        <View style={styles.methodRow}>
          {(["mandor", "langsung"] as const).map((m) => {
            const active = method === m;
            return (
              <Pressable key={m} testID={`payment-method-${m}`} onPress={() => setMethod(m)}
                style={[styles.methodChip, active && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                <MaterialDesignIcons name={m === "mandor" ? "account-tie-outline" : "cash-fast"} size={17} color={active ? colors.onBrandPrimary : colors.onSurfaceTertiary} />
                <Text style={[styles.methodText, active && { color: colors.onBrandPrimary }]}>{m === "mandor" ? "Titip ke Mandor" : "Bayar Langsung"}</Text>
              </Pressable>
            );
          })}
        </View>
        {method === "mandor" ? (
          <Field testID="payment-mandor-input" label="NAMA MANDOR PENERIMA" value={mandorName} onChangeText={setMandorName} placeholder="Contoh: Pak RT / Budi Mandor" />
        ) : null}

        <Text style={styles.formLabel}>JUMLAH PER PEKERJA</Text>
        {selectedRows.map((row) => (
          <View key={row.worker_id} style={styles.amountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{row.name}</Text>
              <Text style={styles.muted}>Sisa {money(row.remaining)}</Text>
            </View>
            <View style={{ width: 130 }}>
              <Field testID={`payment-amount-${row.worker_id}`} label="JUMLAH (RP)" value={amounts[row.worker_id] ?? ""}
                onChangeText={(v) => setAmounts((cur) => ({ ...cur, [row.worker_id]: v.replace(/[^0-9]/g, "") }))} keyboardType="numeric" placeholder="0" />
            </View>
          </View>
        ))}

        <Field testID="payment-note-input" label="CATATAN (OPSIONAL)" value={note} onChangeText={setNote} placeholder="Contoh: gaji periode 1–15" />
        <PrimaryButton testID="payment-submit-button" label={busy ? "Menyimpan..." : `Catat pembayaran ${money(selectedIds.reduce((s, id) => s + Number(amounts[id] || "0"), 0))}`}
          icon="check-circle-outline" onPress={submitPayment} disabled={busy} />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  headerArea: { paddingTop: 8, gap: 12 },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  monthArrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: colors.muted, fontSize: 12 },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40, gap: 12 },
  summary: { flexDirection: "row", padding: 16, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryDivider: { width: 1, backgroundColor: colors.divider },
  summaryLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  summaryValue: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  exportRow: { flexDirection: "row", gap: 10 },
  sectionTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  rowInfo: { flex: 1, gap: 1 },
  rowName: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  rowMeta: { color: colors.onSurfaceSecondary, fontSize: 11, marginTop: 2 },
  rowAmounts: { alignItems: "flex-end", gap: 2 },
  rowGross: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  rowRemaining: { fontSize: 11, fontWeight: "700" },
  paymentCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  paymentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  paymentRight: { alignItems: "flex-end", gap: 6 },
  payBar: { position: "absolute", left: 20, right: 20, flexDirection: "row", alignItems: "center", gap: 14, padding: 12, paddingLeft: 16, borderRadius: 16, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.brandPrimary },
  payBarLabel: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700" },
  payBarValue: { color: colors.onSurface, fontSize: 17, fontWeight: "900", marginTop: 1 },
  formLabel: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700", marginBottom: 8 },
  methodRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  methodChip: { flex: 1, minHeight: 46, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary },
  methodText: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "800" },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
}));
