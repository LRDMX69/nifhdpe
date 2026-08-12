/**
 * Industrial-grade CSV export for list views.
 *
 * - UTF-8 BOM so Excel opens Naira (₦) and accented characters correctly.
 * - RFC-4180 escaping: quotes doubled, fields containing commas/quotes/newlines
 *   wrapped in quotes.
 * - Optional per-column formatting so values ship as the user sees them.
 */
export interface CsvColumn<T> {
  header: string;
  /** Row accessor; may return a formatted string. */
  value: (row: T) => string | number | null | undefined;
}

const escapeCell = (raw: string | number | null | undefined): string => {
  const value = raw === null || raw === undefined ? "" : String(raw);
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export function exportCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(","));
  const csv = `\uFEFF${[header, ...body].join("\r\n")}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** ISO date → dd MMM yyyy for readable CSV cells. */
export const csvDate = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
