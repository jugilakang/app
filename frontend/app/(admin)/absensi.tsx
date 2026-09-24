import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Avatar, Banner, ChipRow, EmptyState, Field, PrimaryButton, ScreenTitle, Sheet } from "@/src/components/ui";
import { addDays, dayPartLabel, fmtDateID, fmtHours, money, todayISO } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";
import type { AttendanceResponse, AttendanceRow, DayStatus, TapType } from "@/src/types";

const GROUP_FILTERS = ["Semua", "Teknisi", "Besi", "Kayu", "Finishing", "Tukang", "Kuli"];

const TAP_BUTTONS: { type: TapType; label: string; icon: string }[] = [
  { type: "masuk", label: "Masuk", icon: "login-variant" },
  { type: "istirahat", label: "Istirahat", icon: "coffee-outline" },
  { type: "lembur", label: "Lembur", icon: "clock-plus-outline" },
  { type: "pulang", label: "Pulang", icon: "logout-variant" },
];

export default function AbsensiScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState(todayISO());
  const [group, setGroup] = useState("Semua");
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [editing, setEditing] = useState<AttendanceRow | null>(null);
  const [editError, setEditError] = useState("");
  const [busy, setBusy] = useState(false);

  // form edit
  const [fMasuk, setFMasuk] = useState("");
  const [fPulang, setFPulang] = useState("");
  const [fNoSiang, setFNoSiang] = useState(false);
  const [fNoSore, setFNoSore] = useState(false);
  const [fLembur, setFLembur] = useState(false);
  const [fLemburHours, setFLemburHours] = useState("");
  const [fLemburNote, setFLemburNote] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api.attendance(date, group));
    } catch (err) {
      setBanner({ text: err instanceof Error ? err.message : "Gagal memuat absensi", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [date, group]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  const patchRow = (updated: AttendanceRow) =>
    setData((cur) => (cur ? { ...cur, rows: cur.rows.map((r) => (r.worker.id === updated.worker.id ? updated : r)) } : cur));

  const doTap = async (row: AttendanceRow, type: TapType) => {
    try {
      setBanner(null);
      patchRow(await api.tap(row.worker.id, type, date));
    } catch (err) {
      setBanner({ text: err instanceof Error ? err.message : "Gagal mencatat", tone: "error" });
    }
  };

  const openEdit = (row: AttendanceRow) => {
    const rec = row.record;
    setEditError("");
    setFMasuk(rec?.masuk_at ?? "");
    setFPulang(rec?.pulang_at ?? "");
    setFNoSiang(rec?.no_rest_siang ?? false);
    setFNoSore(rec?.no_rest_sore ?? false);
    setFLembur(rec?.lembur ?? false);
    setFLemburHours(rec?.lembur_hours ? String(rec.lembur_hours) : "");
    setFLemburNote(rec?.lembur_note ?? "");
    setEditing(row);
  };

  const saveEdit = async () => {
    if (!editing?.record) return;
    try {
      setBusy(true);
      setEditError("");
      patchRow(await api.updateAttendance(editing.record.id, {
        masuk_at: fMasuk.trim() || null,
        pulang_at: fPulang.trim() || null,
        no_rest_siang: fNoSiang,
        no_rest_sore: fNoSore,
        lembur: fLembur,
        lembur_hours: fLemburHours.trim() === "" ? null : Number(fLemburHours),
        lembur_note: fLemburNote.trim(),
      }));
      setEditing(null);
      setBanner({ text: "Catatan absensi diperbarui", tone: "success" });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  const deleteRecord = async () => {
    if (!editing?.record) return;
    try {
      setBusy(true);
      setEditError("");
      await api.deleteAttendance(editing.record.id);
      patchRow({ ...editing, record: null, status: "belum", calc: null });
      setEditing(null);
      setBanner({ text: "Catatan absensi dihapus", tone: "success" });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setBusy(false);
    }
  };

  const statusColor = (s: DayStatus) =>
    s === "pulang" ? colors.info : s === "lembur" ? colors.brandSecondary : s === "istirahat" ? colors.warning : s === "masuk" ? colors.success : colors.muted;
  const statusLabel = (s: DayStatus) => ({ belum: "BELUM", masuk: "MASUK", istirahat: "ISTIRAHAT", lembur: "LEMBUR", pulang: "PULANG" })[s];

  const tapEnabled = (row: AttendanceRow, type: TapType) => {
    const rec = row.record;
    if (type === "masuk") return !rec?.masuk_at;
    if (type === "lembur") return !!rec?.masuk_at && !rec?.pulang_at && !rec?.lembur;
    return !!rec?.masuk_at && !rec?.pulang_at;
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerArea}>
        <ScreenTitle eyebrow="ABSENSI TAP" title="Catat kehadiran" />
        <View style={styles.dateRow}>
          <Pressable testID="attendance-prev-day" onPress={() => setDate(addDays(date, -1))} style={styles.dateArrow}>
            <MaterialDesignIcons name="chevron-left" size={22} color={colors.onSurface} />
          </Pressable>
          <Pressable testID="attendance-today-reset" onPress={() => setDate(todayISO())} style={styles.dateLabelWrap}>
            <MaterialDesignIcons name="calendar-today" size={15} color={colors.brandPrimary} />
            <Text style={styles.dateLabel}>{date === todayISO() ? `Hari ini · ${fmtDateID(date)}` : fmtDateID(date)}</Text>
          </Pressable>
          <Pressable testID="attendance-next-day" onPress={() => setDate(addDays(date, 1))} style={styles.dateArrow}>
            <MaterialDesignIcons name="chevron-right" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        <ChipRow testID="attendance-group-filter" options={GROUP_FILTERS} value={group} onChange={setGroup} />
      </View>

      {banner ? <Banner testID="attendance-banner" text={banner.text} tone={banner.tone} onClose={() => setBanner(null)} /> : null}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brandPrimary} size="large" /><Text style={styles.muted}>Memuat daftar pekerja...</Text></View>
      ) : !data || data.rows.length === 0 ? (
        <EmptyState icon="account-group-outline" title="Belum ada pekerja" body="Tambahkan pekerja dulu dari tab Pekerja." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brandPrimary} />}>
          {data.rows.map((row) => (
            <View key={row.worker.id} style={styles.card} testID={`attendance-card-${row.worker.id}`}>
              <View style={styles.cardHeader}>
                <Avatar name={row.worker.name} size={40} />
                <View style={styles.cardInfo}>
                  <Text style={styles.workerName}>{row.worker.name}</Text>
                  <Text style={styles.muted}>{row.worker.code} · {row.worker.group}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor(row.status) }]}>
                  <Text style={styles.statusText}>{statusLabel(row.status)}</Text>
                </View>
                <Pressable testID={`attendance-edit-${row.worker.id}`} onPress={() => openEdit(row)} style={styles.editButton}>
                  <MaterialDesignIcons name="pencil-outline" size={17} color={colors.onSurfaceSecondary} />
                </Pressable>
              </View>

              {row.record?.masuk_at ? (
                <View style={styles.timesRow}>
                  <Text style={styles.timeText}>Masuk {row.record.masuk_at}</Text>
                  <MaterialDesignIcons name="arrow-right" size={13} color={colors.muted} />
                  <Text style={styles.timeText}>{row.record.pulang_at ? `Pulang ${row.record.pulang_at}` : "Belum pulang"}</Text>
                </View>
              ) : null}

              {row.calc ? (
                <Text style={styles.calcText} testID={`attendance-calc-${row.worker.id}`}>
                  {dayPartLabel(row.calc)} · {money(row.calc.total)}
                </Text>
              ) : null}

              <View style={styles.tapRow}>
                {TAP_BUTTONS.map((btn) => {
                  const enabled = tapEnabled(row, btn.type);
                  return (
                    <Pressable key={btn.type} testID={`attendance-tap-${btn.type}-${row.worker.id}`} disabled={!enabled}
                      onPress={() => doTap(row, btn.type)}
                      style={({ pressed }) => [styles.tapButton, !enabled && styles.tapDisabled, pressed && enabled && { opacity: 0.75 }]}>
                      <MaterialDesignIcons name={btn.icon as never} size={16} color={enabled ? colors.brandPrimary : colors.muted} />
                      <Text style={[styles.tapText, !enabled && { color: colors.muted }]}>{btn.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Sheet testID="attendance-edit-sheet" visible={!!editing} onClose={() => setEditing(null)}
        title={editing ? `Edit · ${editing.worker.name}` : ""}>
        {editError ? <Banner testID="attendance-edit-error" text={editError} onClose={() => setEditError("")} /> : null}
        <View style={styles.timeGrid}>
          <View style={{ flex: 1 }}>
            <Field testID="edit-masuk-input" label="JAM MASUK (HH:MM)" value={fMasuk} onChangeText={setFMasuk} placeholder="07:00" keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Field testID="edit-pulang-input" label="JAM PULANG (HH:MM)" value={fPulang} onChangeText={setFPulang} placeholder="17:00" keyboardType="numbers-and-punctuation" />
          </View>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Tanpa istirahat siang</Text>
            <Text style={styles.muted}>11.30–13.00 dibayar +1,5 j × tarif lembur</Text>
          </View>
          <Switch testID="edit-no-rest-siang" value={fNoSiang} onValueChange={setFNoSiang} trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }} thumbColor={colors.onBrandPrimary} />
        </View>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Tanpa istirahat sore</Text>
            <Text style={styles.muted}>17.00–18.00 dibayar +1 j × tarif lembur</Text>
          </View>
          <Switch testID="edit-no-rest-sore" value={fNoSore} onValueChange={setFNoSore} trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }} thumbColor={colors.onBrandPrimary} />
        </View>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Lembur</Text>
            <Text style={styles.muted}>Per jam mulai 18.00 × tarif lembur</Text>
          </View>
          <Switch testID="edit-lembur" value={fLembur} onValueChange={setFLembur} trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }} thumbColor={colors.onBrandPrimary} />
        </View>

        {fLembur ? (
          <>
            <Field testID="edit-lembur-hours" label="JAM LEMBUR (KOSONGKAN = OTOMATIS DARI JAM PULANG)" value={fLemburHours}
              onChangeText={(v) => setFLemburHours(v.replace(/[^0-9.]/g, ""))} placeholder="Contoh: 2" keyboardType="decimal-pad" />
            <Field testID="edit-lembur-note" label="CATATAN LEMBUR" value={fLemburNote} onChangeText={setFLemburNote} placeholder="Contoh: pasang rangka atap" />
          </>
        ) : null}

        {editing?.calc ? (
          <View style={styles.calcBox}>
            <Text style={styles.calcBoxText}>Perkiraan hari ini: {dayPartLabel(editing.calc)}</Text>
            <Text style={styles.calcBoxValue}>{money(editing.calc.total)}</Text>
          </View>
        ) : null}

        <PrimaryButton testID="edit-save-button" label={busy ? "Menyimpan..." : "Simpan perubahan"} icon="content-save-outline" onPress={saveEdit} disabled={busy} />
        <View style={{ height: 10 }} />
        <PrimaryButton testID="edit-delete-button" label="Hapus catatan hari ini" icon="trash-can-outline" tone="danger" onPress={deleteRecord} disabled={busy} />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  headerArea: { paddingTop: 8, gap: 12 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20 },
  dateArrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  dateLabelWrap: { flex: 1, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  dateLabel: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: colors.muted, fontSize: 12 },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32, gap: 12 },
  card: { padding: 14, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardInfo: { flex: 1 },
  workerName: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  statusText: { color: colors.onBrandPrimary, fontSize: 9, fontWeight: "800" },
  editButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.surfaceTertiary },
  timesRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  timeText: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "600" },
  calcText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  tapRow: { flexDirection: "row", gap: 7 },
  tapButton: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", gap: 3 },
  tapDisabled: { opacity: 0.45 },
  tapText: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "700" },
  timeGrid: { flexDirection: "row", gap: 10 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 4 },
  switchTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  calcBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, backgroundColor: colors.brandTertiary, marginBottom: 14 },
  calcBoxText: { color: colors.onSurfaceTertiary, fontSize: 12, flex: 1, marginRight: 10 },
  calcBoxValue: { color: colors.onBrandTertiary, fontSize: 16, fontWeight: "800" },
}));
