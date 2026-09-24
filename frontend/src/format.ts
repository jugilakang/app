export const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Waktu Indonesia Barat (UTC+7) terlepas dari zona perangkat. */
export function nowWIB(): Date {
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() + 7 * 60) * 60000);
}

export const todayISO = () => toISO(nowWIB());

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export const monthOf = (iso: string) => iso.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_ID[m - 1]} ${y}`;
}

export function fmtDateID(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function periodDates(month: string, period: 1 | 2): { start: string; end: string; label: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return period === 1
    ? { start: `${month}-01`, end: `${month}-15`, label: `1–15 ${MONTHS_SHORT[m - 1]}` }
    : { start: `${month}-16`, end: `${month}-${last}`, label: `16–${last} ${MONTHS_SHORT[m - 1]}` };
}

export function currentPeriod(): 1 | 2 {
  return nowWIB().getDate() <= 15 ? 1 : 2;
}

export const money = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;

export const fmtHours = (hours: number) => `${String(Math.round(hours * 10) / 10).replace(".", ",")} j`;

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
