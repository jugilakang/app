import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Avatar, Banner, ChipRow, EmptyState, Field, PrimaryButton, ScreenTitle, Sheet } from "@/src/components/ui";
import { money } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";
import type { Worker } from "@/src/types";

const GROUP_FILTERS = ["Semua", "Teknisi", "Besi", "Kayu", "Finishing", "Tukang", "Kuli"];
const GROUPS = GROUP_FILTERS.slice(1);

type CredPanel = { name: string; code: string; pin: string };

export default function PekerjaScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const [group, setGroup] = useState("Semua");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [editing, setEditing] = useState<Worker | null>(null);
  const [cred, setCred] = useState<CredPanel | null>(null);
  const [busy, setBusy] = useState(false);

  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fGroup, setFGroup] = useState("Tukang");
  const [fHourly, setFHourly] = useState("");
  const [fOvertime, setFOvertime] = useState("");
  const [fPin, setFPin] = useState("");

  const load = useCallback(async () => {
    try {
      setWorkers(await api.workers(group));
    } catch (err) {
      setBanner({ text: err instanceof Error ? err.message : "Gagal memuat pekerja", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setSheetError("");
    setFName(""); setFPhone(""); setFGroup("Tukang"); setFHourly(""); setFOvertime(""); setFPin("");
    setSheetOpen(true);
  };

  const openEdit = (worker: Worker) => {
    setEditing(worker);
    setSheetError("");
    setFName(worker.name); setFPhone(worker.phone); setFGroup(worker.group);
    setFHourly(String(worker.hourly_rate)); setFOvertime(String(worker.overtime_rate)); setFPin("");
    setSheetOpen(true);
  };

  const submit = async () => {
    if (!fName.trim() || !fHourly || !fOvertime) {
      setSheetError("Lengkapi nama, tarif per jam, dan tarif lembur");
      return;
    }
    try {
      setBusy(true);
      setSheetError("");
      if (editing) {
        await api.updateWorker(editing.id, {
          name: fName.trim(), phone: fPhone.trim(), group: fGroup,
          hourly_rate: Number(fHourly), overtime_rate: Number(fOvertime),
        });
        setBanner({ text: "Data pekerja diperbarui", tone: "success" });
      } else {
        const created = await api.createWorker({
          name: fName.trim(), phone: fPhone.trim(), group: fGroup,
          hourly_rate: Number(fHourly), overtime_rate: Number(fOvertime),
          ...(fPin.trim() ? { pin: fPin.trim() } : {}),
        });
        setCred({ name: created.name, code: created.code, pin: created.pin });
      }
      setSheetOpen(false);
      await load();
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "Gagal menyimpan pekerja");
    } finally {
      setBusy(false);
    }
  };

  const resetPin = async (worker: Worker) => {
    try {
      setBanner(null);
      const res = await api.resetPin(worker.id);
      setCred({ name: res.name, code: res.code, pin: res.pin });
    } catch (err) {
      setBanner({ text: err instanceof Error ? err.message : "Gagal reset PIN", tone: "error" });
    }
  };

  const removeWorker = async (worker: Worker) => {
    try {
      setBanner(null);
      const res = await api.deleteWorker(worker.id);
      setBanner({
        text: res.deactivated ? `${worker.name} dinonaktifkan (riwayat absensi dipertahankan)` : `${worker.name} dihapus`,
        tone: "success",
      });
      await load();
    } catch (err) {
      setBanner({ text: err instanceof Error ? err.message : "Gagal menghapus pekerja", tone: "error" });
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerArea}>
        <ScreenTitle eyebrow="TIM LAPANGAN" title="Pekerja & grup" />
        <ChipRow testID="worker-group-filter" options={GROUP_FILTERS} value={group} onChange={setGroup} />
      </View>

      {banner ? <Banner testID="worker-banner" text={banner.text} tone={banner.tone} onClose={() => setBanner(null)} /> : null}

      {cred ? (
        <View style={styles.credCard} testID="worker-credential-panel">
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.credTitle}>Bagikan ke {cred.name}</Text>
            <Text style={styles.credLine}>Kode: <Text style={styles.credValue}>{cred.code}</Text></Text>
            <Text style={styles.credLine}>PIN: <Text style={styles.credValue}>{cred.pin}</Text></Text>
            <Text style={styles.credHint}>PIN hanya ditampilkan sekali. Admin bisa reset kapan saja.</Text>
          </View>
          <Pressable testID="credential-close" onPress={() => setCred(null)} style={styles.credClose}>
            <MaterialDesignIcons name="check" size={20} color={colors.onSuccess} />
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.brandPrimary} size="large" /><Text style={styles.muted}>Memuat pekerja...</Text></View>
      ) : workers.length === 0 ? (
        <EmptyState icon="account-plus-outline" title="Belum ada pekerja" body="Tekan tombol + untuk menambah pekerja pertama." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brandPrimary} />}>
          {workers.map((worker) => (
            <View key={worker.id} style={styles.card} testID={`worker-card-${worker.id}`}>
              <View style={styles.cardTop}>
                <Avatar name={worker.name} size={42} />
                <View style={styles.cardInfo}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.muted}>{worker.code} · {worker.group}{worker.phone ? ` · ${worker.phone}` : ""}</Text>
                  <Text style={styles.rateText}>{money(worker.hourly_rate)}/jam · Lembur {money(worker.overtime_rate)}/jam</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable testID={`worker-edit-${worker.id}`} onPress={() => openEdit(worker)} style={styles.actionButton}>
                  <MaterialDesignIcons name="pencil-outline" size={16} color={colors.onSurfaceTertiary} />
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
                <Pressable testID={`worker-reset-pin-${worker.id}`} onPress={() => resetPin(worker)} style={styles.actionButton}>
                  <MaterialDesignIcons name="key-outline" size={16} color={colors.warning} />
                  <Text style={styles.actionText}>Reset PIN</Text>
                </Pressable>
                <Pressable testID={`worker-delete-${worker.id}`} onPress={() => removeWorker(worker)} style={styles.actionButton}>
                  <MaterialDesignIcons name="trash-can-outline" size={16} color={colors.error} />
                  <Text style={styles.actionText}>Hapus</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable testID="worker-add-fab" onPress={openAdd} style={[styles.fab, { bottom: bottomChrome + 16 }]}>
        <MaterialDesignIcons name="plus" size={26} color={colors.onBrandPrimary} />
      </Pressable>

      <Sheet testID="worker-form-sheet" visible={sheetOpen} onClose={() => { setSheetOpen(false); setSheetError(""); }} title={editing ? "Edit pekerja" : "Tambah pekerja"}>
        {sheetError ? <Banner testID="worker-form-error" text={sheetError} onClose={() => setSheetError("")} /> : null}
        <Field testID="worker-name-input" label="NAMA LENGKAP" value={fName} onChangeText={setFName} placeholder="Contoh: Budi Santoso" />
        <Field testID="worker-phone-input" label="TELEPON (OPSIONAL)" value={fPhone} onChangeText={setFPhone} placeholder="08xxxxxxxxxx" keyboardType="phone-pad" />
        <Text style={styles.formLabel}>GRUP / DIVISI</Text>
        <View style={styles.groupWrap}>
          {GROUPS.map((g) => (
            <Pressable key={g} testID={`worker-group-${g.toLowerCase()}`} onPress={() => setFGroup(g)}
              style={[styles.groupChip, fGroup === g && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
              <Text style={[styles.groupChipText, fGroup === g && { color: colors.onBrandPrimary }]}>{g}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.rateGrid}>
          <View style={{ flex: 1 }}>
            <Field testID="worker-hourly-input" label="TARIF PER JAM (RP)" value={fHourly} onChangeText={(v) => setFHourly(v.replace(/[^0-9]/g, ""))} placeholder="15000" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field testID="worker-overtime-input" label="LEMBUR PER JAM (RP)" value={fOvertime} onChangeText={(v) => setFOvertime(v.replace(/[^0-9]/g, ""))} placeholder="20000" keyboardType="numeric" />
          </View>
        </View>
        {!editing ? (
          <Field testID="worker-pin-input" label="PIN 4 DIGIT (KOSONGKAN = ACAK)" value={fPin} onChangeText={(v) => setFPin(v.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="••••" keyboardType="number-pad" />
        ) : null}
        <PrimaryButton testID="worker-save-button" label={busy ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah pekerja"} icon="content-save-outline" onPress={submit} disabled={busy} />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  headerArea: { paddingTop: 8, gap: 12 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: colors.muted, fontSize: 12 },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 96, gap: 12 },
  card: { padding: 14, backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardInfo: { flex: 1, gap: 2 },
  workerName: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  rateText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "700", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, minHeight: 40, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary },
  actionText: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "700" },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandPrimary, elevation: 4 },
  credCard: { flexDirection: "row", marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: 14, backgroundColor: colors.success, alignItems: "flex-start" },
  credTitle: { color: colors.onSuccess, fontSize: 13, fontWeight: "800" },
  credLine: { color: colors.onSuccess, fontSize: 13 },
  credValue: { fontWeight: "900", letterSpacing: 1 },
  credHint: { color: colors.onSuccess, fontSize: 10, opacity: 0.85, marginTop: 2 },
  credClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  formLabel: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700", marginBottom: 8 },
  groupWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  groupChip: { height: 36, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary },
  groupChipText: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "700" },
  rateGrid: { flexDirection: "row", gap: 10 },
}));
