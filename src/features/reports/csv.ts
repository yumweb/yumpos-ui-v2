/** Quote a CSV cell (wrap in quotes, escape embedded quotes). */
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Trigger a client-side CSV download from a 2D string array. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const body = rows.map((r) => r.map(cell).join(",")).join("\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build CSV from a list of flat row objects (keys become the header row). */
export function objectsToCsv<T extends Record<string, unknown>>(rows: T[]): (string | number)[][] {
  if (rows.length === 0) return [[]];
  const keys = Object.keys(rows[0]);
  return [keys, ...rows.map((r) => keys.map((k) => (r[k] == null ? "" : String(r[k]))))];
}
