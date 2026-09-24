import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { storage } from "@/src/utils/storage";
import type {
  AttendanceResponse,
  AttendanceRow,
  Dashboard,
  MeResponse,
  Payment,
  Payroll,
  TapType,
  Worker,
  WorkerAttendance,
  WorkerPayroll,
  WorkerWithPin,
} from "./types";

export const AUTH_TOKEN_KEY = "auth_token";

const baseUrl = (process.env.EXPO_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");
export const API_URL = `${baseUrl}/api`;

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = await storage.secureGet(AUTH_TOKEN_KEY, "");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401 && auth) await storage.secureRemove(AUTH_TOKEN_KEY);
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? "Tidak dapat terhubung ke server");
  }
  return response.json() as Promise<T>;
}

export const api = {
  // auth
  adminLogin: (username: string, password: string) =>
    request<{ access_token: string; role: "admin" }>("/auth/admin-login", { method: "POST", body: JSON.stringify({ username, password }) }, false),
  workerLogin: (code: string, pin: string) =>
    request<{ access_token: string; role: "worker"; worker: Worker }>("/auth/worker-login", { method: "POST", body: JSON.stringify({ code, pin }) }, false),
  me: () => request<MeResponse>("/auth/me"),

  // workers (admin)
  workers: (group?: string) => request<Worker[]>(`/workers${group && group !== "Semua" ? `?group=${encodeURIComponent(group)}` : ""}`),
  createWorker: (body: { name: string; phone: string; group: string; daily_rate: number; overtime_rate: number; pin?: string }) =>
    request<WorkerWithPin>("/workers", { method: "POST", body: JSON.stringify(body) }),
  updateWorker: (id: string, body: Partial<{ name: string; phone: string; group: string; daily_rate: number; overtime_rate: number; active: boolean }>) =>
    request<Worker>(`/workers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  resetPin: (id: string) => request<{ id: string; code: string; name: string; pin: string }>(`/workers/${id}/reset-pin`, { method: "POST" }),
  deleteWorker: (id: string) => request<{ deleted: boolean; deactivated: boolean }>(`/workers/${id}`, { method: "DELETE" }),

  // attendance (admin)
  attendance: (date: string, group?: string) =>
    request<AttendanceResponse>(`/attendance?date=${date}${group && group !== "Semua" ? `&group=${encodeURIComponent(group)}` : ""}`),
  tap: (worker_id: string, type: TapType, date: string) =>
    request<AttendanceRow>("/attendance/tap", { method: "POST", body: JSON.stringify({ worker_id, type, date }) }),
  updateAttendance: (id: string, body: { masuk_at: string | null; pulang_at: string | null; no_rest_siang: boolean; no_rest_sore: boolean; lembur: boolean; lembur_hours: number | null; lembur_note: string }) =>
    request<AttendanceRow>(`/attendance/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteAttendance: (id: string) => request<{ deleted: boolean }>(`/attendance/${id}`, { method: "DELETE" }),

  // dashboard (admin)
  dashboard: (date: string) => request<Dashboard>(`/dashboard?date=${date}`),

  // payroll & payments (admin)
  payroll: (month: string, period: 1 | 2, group?: string) =>
    request<Payroll>(`/payroll?month=${month}&period=${period}${group && group !== "Semua" ? `&group=${encodeURIComponent(group)}` : ""}`),
  payments: (month: string, period: 1 | 2) => request<Payment[]>(`/payments?month=${month}&period=${period}`),
  createPayment: (body: { month: string; period: 1 | 2; method: "mandor" | "langsung"; mandor_name: string; note: string; items: { worker_id: string; amount: number }[] }) =>
    request<Payment>("/payments", { method: "POST", body: JSON.stringify(body) }),
  deletePayment: (id: string) => request<{ deleted: boolean }>(`/payments/${id}`, { method: "DELETE" }),

  // worker self-service
  workerMe: () => request<Worker>("/worker/me"),
  workerAttendance: (month: string) => request<WorkerAttendance>(`/worker/attendance?month=${month}`),
  workerPayroll: (month: string, period: 1 | 2) => request<WorkerPayroll>(`/worker/payroll?month=${month}&period=${period}`),
};

/** Unduh file Excel ekspor. Web: unduh langsung via browser. Native: unduh lalu buka lembar share. */
export async function downloadExport(kind: "payroll" | "attendance", params: { month: string; period: 1 | 2; group?: string }) {
  const token = (await storage.secureGet(AUTH_TOKEN_KEY, "")) ?? "";
  const qs = new URLSearchParams({ month: params.month, period: String(params.period), token });
  if (params.group && params.group !== "Semua") qs.set("group", params.group);
  const url = `${API_URL}/export/${kind}?${qs.toString()}`;
  const filename = `mandorapp-${kind}-${params.month}-p${params.period}.xlsx`;
  if (Platform.OS === "web") {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }
  const target = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(url, target);
  if (result.status >= 400) throw new Error("Gagal mengunduh file ekspor");
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Bagikan file Excel",
    });
  }
}
