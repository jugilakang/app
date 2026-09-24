export type Role = "admin" | "worker";

export type Worker = {
  id: string;
  code: string;
  name: string;
  phone: string;
  group: string;
  daily_rate: number;
  overtime_rate: number;
  active: boolean;
  created_at: string;
};

export type WorkerWithPin = Worker & { pin: string };

export type TapType = "masuk" | "istirahat" | "lembur" | "pulang";
export type DayStatus = "belum" | "masuk" | "istirahat" | "lembur" | "pulang";
export type DayType = "none" | "half" | "full";

export type AttendanceEvent = { type: TapType; at: string };

export type AttendanceRecord = {
  id: string;
  worker_id: string;
  date: string;
  masuk_at: string | null;
  pulang_at: string | null;
  no_rest_siang: boolean;
  no_rest_sore: boolean;
  lembur: boolean;
  lembur_hours: number;
  lembur_note: string;
  events: AttendanceEvent[];
  updated_at: string;
};

export type DayCalc = {
  day_type: DayType;
  base_pay: number;
  rest_hours: number;
  rest_pay: number;
  lembur_hours: number;
  overtime_pay: number;
  total: number;
};

export type AttendanceRow = {
  worker: Worker;
  record: AttendanceRecord | null;
  status: DayStatus;
  calc: DayCalc | null;
};

export type AttendanceResponse = { date: string; rows: AttendanceRow[] };

export type PayrollRow = {
  worker_id: string;
  code: string;
  name: string;
  group: string;
  daily_rate: number;
  overtime_rate: number;
  days: number;
  half_days: number;
  rest_hours: number;
  overtime_hours: number;
  base_pay: number;
  rest_pay: number;
  overtime_pay: number;
  gross: number;
  paid: number;
  remaining: number;
};

export type Payroll = {
  month: string;
  period: number;
  start_date: string;
  end_date: string;
  rows: PayrollRow[];
  total_gross: number;
  total_paid: number;
  total_remaining: number;
};

export type PaymentSplit = { worker_id: string; worker_name: string; amount: number };

export type Payment = {
  id: string;
  month: string;
  period: number;
  method: "mandor" | "langsung";
  mandor_name: string;
  note: string;
  splits: PaymentSplit[];
  total: number;
  created_at: string;
};

export type DashboardGroup = { group: string; total: number; present: number };

export type Dashboard = {
  date: string;
  active_workers: number;
  present: number;
  pulang_done: number;
  lembur: number;
  absent: number;
  est_pay_today: number;
  groups: DashboardGroup[];
};

export type MeResponse = { role: Role; username?: string; worker?: Worker };

export type WorkerAttendanceRow = { record: AttendanceRecord; status: DayStatus; calc: DayCalc | null };
export type WorkerAttendance = { month: string; rows: WorkerAttendanceRow[] };

export type WorkerPayment = {
  id: string;
  method: "mandor" | "langsung";
  mandor_name: string;
  note: string;
  amount: number;
  created_at: string;
};

export type WorkerPayroll = {
  month: string;
  period: number;
  start_date: string;
  end_date: string;
  days: number;
  half_days: number;
  rest_hours: number;
  overtime_hours: number;
  base_pay: number;
  rest_pay: number;
  overtime_pay: number;
  gross: number;
  paid: number;
  remaining: number;
  payments: WorkerPayment[];
};
