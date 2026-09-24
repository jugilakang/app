import Constants from "expo-constants";
import type { Attendance, Dashboard, Payroll, Project, Worker } from "./types";

const baseUrl = Constants.expoConfig?.extra?.backendUrl ?? process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
const API_URL = `${baseUrl.replace(/\/$/, "")}/api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) }, ...options });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? "Tidak dapat terhubung ke server");
  }
  return response.json() as Promise<T>;
}

export const api = {
  projects: () => request<Project[]>("/projects"),
  createProject: (body: { name: string; location: string }) => request<Project>("/projects", { method: "POST", body: JSON.stringify(body) }),
  workers: (projectId?: string) => request<Worker[]>(`/workers${projectId ? `?project_id=${encodeURIComponent(projectId)}` : ""}`),
  createWorker: (body: Omit<Worker, "id" | "status" | "created_at" | "project_name">) => request<Worker>("/workers", { method: "POST", body: JSON.stringify(body) }),
  dashboard: (projectId: string, date: string) => request<Dashboard>(`/dashboard?project_id=${projectId}&date=${date}`),
  attendance: (projectId: string, date: string) => request<Attendance[]>(`/attendance?project_id=${projectId}&date=${date}`),
  saveAttendance: (body: Omit<Attendance, "id" | "worker_name" | "daily_rate" | "half_day_rate" | "overtime_rate" | "created_at">) => request<Attendance>("/attendance", { method: "POST", body: JSON.stringify(body) }),
  payroll: (projectId: string, startDate: string, endDate: string) => request<Payroll>(`/payroll?project_id=${projectId}&start_date=${startDate}&end_date=${endDate}`),
  setPayrollStatus: (body: { project_id: string; start_date: string; end_date: string; status: "paid" | "unpaid" }) => request<{ status: string }>("/payroll/status", { method: "POST", body: JSON.stringify(body) }),
};