# TukangGaji Pro — PRD

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
- V2 penuh: auth 2 peran (admin seeded + worker code/PIN, reset PIN, duplikat nama 409), dasbor admin (estimasi upah, statistik, kehadiran per grup, aktivitas), absensi tap + edit/hapus + toggle tanpa istirahat siang/sore + lembur otomatis/manual + catatan, payroll per jam periode 1–15 / 16–akhir, pembayaran multi-pekerja via mandor/langsung + riwayat, ekspor .xlsx (gaji & absensi, unduh web / share sheet native), portal pekerja read-only (beranda, absensi bulanan, gaji per periode + pembayaran diterima).
- Perhitungan terverifikasi: 07.00–20.30 tanpa istirahat dua-duanya + lembur → 11 j reguler + 2,5 j lembur = Rp 215.000 (tarif 15rb/20rb).
- Testing: 25/25 pytest backend PASS; semua alur UI PASS (testing agent, iteration_1). Bug guard role & error banner dalam sheet diperbaiki.

## Backlog
- P0: (kosong)
- P1: riwayat perubahan tarif (snapshot tarif per hari agar edit tarif tidak retroaktif); tanda bukti pembayaran (foto); arsip pekerja nonaktif di UI.
- P2: multi-proyek kembali (pekerja lintas proyek); PIN kustom pekerja (ganti sendiri); mode kasbon/pinjaman dipotong dari gaji; ringkasan PDF slip gaji per pekerja.

## Catatan
- Semua waktu absensi memakai WIB (UTC+7) di server.
- PIN pekerja tidak bisa "dilihat" (hash bcrypt) — hanya ditampilkan sekali saat dibuat/di-reset (keputusan keamanan).
