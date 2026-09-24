# TukangGaji Pro — PRD (sekarang: **MandorApp**, "Powered by Lilik Jr")

## Problem statement asli
"Build a mobile app: buat aplikasi absen beserta include gaji nya untuk proyek ada gajian harian dan bisa setengah hari juga buat detail masuk dan keluar nya lalu ada lemburan nya juga di hitung berdasarkan per jam"

Pivot V2 (user, messages 74/77): peran Admin + Pekerja (view-only, login Kode+PIN), ekspor Excel, payroll 2 mingguan (1–15 & 16–akhir), absensi tap (Masuk/Istirahat/Lembur/Pulang) + edit/hapus, struktur shift per jam (pagi 07.00–11.30, istirahat siang 11.30–13.00 opsional dibayar, siang 13.00–17.00, istirahat sore 17.00–18.00 opsional dibayar, lembur mulai 18.00 per jam), grup/divisi (Teknisi, Besi, Kayu, Finishing, Tukang, Kuli), pembayaran delegasi via Mandor.

## Persona
- **Admin / pemilik proyek**: mengelola pekerja, tarif, absensi harian, rekap & pembayaran gaji, ekspor Excel.
- **Pekerja (tukang/kuli)**: melihat absensi & gaji sendiri, read-only, login dengan Kode + PIN 4 digit.
- **Mandor**: perantara pembayaran kolektif (bukan pengguna aplikasi; namanya dicatat admin).

## Arsitektur
- Frontend: Expo SDK 57 (expo-router), route groups `(admin)` & `(worker)` dengan role guard, tabs (NativeTabs iOS 26+ / Tabs JS), ikon `@react-native-vector-icons/material-design-icons`, token tema di `src/theme.ts` (dark-first #E05A36), auth context `src/auth.tsx`, API client `src/api.ts`.
- Backend: FastAPI + Motor (MongoDB), JWT (HS256, 30 hari), bcrypt (passlib), openpyxl untuk ekspor.
- Kredensial: `backend/.env` → JWT_SECRET, ADMIN_USERNAME=admin, ADMIN_PASSWORD=tukangpro123 (lihat `/app/memory/test_credentials.md`).

## Koleksi DB
- `admins`: {id, username, password_hash} (seed idempoten)
- `workers`: {id, code TG###, name, name_lower, phone, group, hourly_rate, overtime_rate, pin_hash, active}
- `attendance`: {id, worker_id, date, masuk_at, pulang_at, no_rest_siang, no_rest_sore, lembur, lembur_hours, lembur_manual, lembur_note, events[]}
- `payments`: {id, month, period(1|2), method(mandor|langsung), mandor_name, note, splits[{worker_id,worker_name,amount}], total}

## Terimplementasi (24 Sep 2026)
- V1 (awal): proyek/pekerja/absensi harian sederhana + gaji harian (digantikan V2).
- V2 penuh: auth 2 peran (admin seeded + worker code/PIN, reset PIN, duplikat nama 409), dasbor admin (estimasi upah, statistik, kehadiran per grup, aktivitas), absensi tap + edit/hapus + toggle tanpa istirahat siang/sore + lembur otomatis/manual + catatan, payroll periode 1–15 / 16–akhir, pembayaran multi-pekerja via mandor/langsung + riwayat, ekspor .xlsx (gaji & absensi, unduh web / share sheet native), portal pekerja read-only (beranda, absensi bulanan, gaji per periode + pembayaran diterima).
- REVISI MODEL GAJI (24 Sep): gaji pokok PER HARI — penuh = tarif harian, setengah = ½ tarif harian; tarif per jam (overtime_rate) hanya untuk lembur (mulai 18.00) & bonus no-rest siang (1,5 j) / sore (1 j). Field worker: daily_rate + overtime_rate (migrasi hourly_rate×8,5 → daily_rate sudah dijalankan). Terverifikasi: full+no-rest×2+lembur 2,5j = 160rb+50rb+50rb = Rp260.000; ½ hari = Rp80.000.
- REVISI (24 Sep, lanjutan): rebrand MandorApp ("Powered by Lilik Jr" di login + header admin); no-rest siang jadi 1 jam (11.30–12.30); rekap periode menampilkan per pekerja (hari + jam lembur) dan GRAND TOTAL (total_days & total_overtime_hours di API /api/payroll, chip di UI, baris GRAND TOTAL di Excel).
- Testing: iteration_1 25/25 backend + UI PASS; iteration_2 (model per hari) 29/29 + 34/34 PASS; iteration_3 (rebrand + no-rest 1 j + grand total) 33/33 backend + semua cek UI PASS.

## Backlog
- P0: (kosong)
- P1: riwayat perubahan tarif (snapshot tarif per hari agar edit tarif tidak retroaktif); tanda bukti pembayaran (foto); arsip pekerja nonaktif di UI.
- P2: multi-proyek kembali (pekerja lintas proyek); PIN kustom pekerja (ganti sendiri); mode kasbon/pinjaman dipotong dari gaji; ringkasan PDF slip gaji per pekerja.

## Catatan
- Semua waktu absensi memakai WIB (UTC+7) di server.
- PIN pekerja tidak bisa "dilihat" (hash bcrypt) — hanya ditampilkan sekali saat dibuat/di-reset (keputusan keamanan).
