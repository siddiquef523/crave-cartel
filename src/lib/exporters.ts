/* Shared export helpers: CSV, Excel (.xls), PDF (print dialog) and Print.
   Dependency-free so exports work in every browser without extra packages. */

export type Column<T> = {
  header: string;
  value: (row: T) => string | number;
  align?: "left" | "right";
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stamp() {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ CSV */

export function exportCSV<T>(filename: string, columns: Column<T>[], rows: T[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    columns.map((c) => esc(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(",")),
  ];
  // BOM keeps Excel happy with the rupee sign and accents.
  download(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
}

/* ---------------------------------------------------------------- Excel */

function escapeHtml(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Excel-compatible SpreadsheetML workbook — opens natively in Excel and Sheets. */
export function exportExcel<T>(
  filename: string,
  sheetName: string,
  columns: Column<T>[],
  rows: T[],
) {
  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => {
            const v = c.value(r);
            const numeric = typeof v === "number";
            return `<td${numeric ? ' x:num="1"' : ""}>${escapeHtml(v)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${escapeHtml(sheetName)}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>th{background:#f2f2f2;font-weight:bold;border:1px solid #ccc;padding:6px}td{border:1px solid #ddd;padding:6px}</style>
</head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;

  download(
    new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" }),
    filename,
  );
}

/* --------------------------------------------------- Print / PDF export */

export type PrintSection<T = Record<string, unknown>> = {
  title: string;
  columns: Column<T>[];
  rows: T[];
};

export type PrintDocument = {
  title: string;
  subtitle?: string;
  kpis?: { label: string; value: string }[];
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  sections: PrintSection<any>[];
  footer?: string;
};

function buildPrintHtml(doc: PrintDocument) {
  const kpis = (doc.kpis ?? [])
    .map(
      (k) =>
        `<div class="kpi"><span class="kpi-l">${escapeHtml(k.label)}</span><strong class="kpi-v">${escapeHtml(k.value)}</strong></div>`,
    )
    .join("");

  const sections = doc.sections
    .map((s) => {
      const head = s.columns
        .map((c) => `<th class="${c.align === "right" ? "r" : ""}">${escapeHtml(c.header)}</th>`)
        .join("");
      const body =
        s.rows.length === 0
          ? `<tr><td colspan="${s.columns.length}" class="empty">No data</td></tr>`
          : s.rows
              .map(
                (r) =>
                  `<tr>${s.columns
                    .map(
                      (c) =>
                        `<td class="${c.align === "right" ? "r" : ""}">${escapeHtml(c.value(r))}</td>`,
                    )
                    .join("")}</tr>`,
              )
              .join("");
      return `<section><h2>${escapeHtml(s.title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color:#111; margin:0; }
  header { border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.02em; }
  .sub { font-size: 12px; color: #555; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; }
  .kpi-l { display:block; font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color:#666; }
  .kpi-v { display:block; font-size: 16px; margin-top: 4px; }
  section { margin-bottom: 22px; page-break-inside: avoid; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color:#333; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead th { background: #f4f4f4; text-align: left; padding: 7px 8px; border-bottom: 1px solid #bbb; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
  tbody td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  .r { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { text-align:center; color:#888; padding: 18px; }
  footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 10px; color:#666; }
  thead { display: table-header-group; }
</style></head>
<body>
  <header>
    <h1>${escapeHtml(doc.title)}</h1>
    ${doc.subtitle ? `<div class="sub">${escapeHtml(doc.subtitle)}</div>` : ""}
  </header>
  ${kpis ? `<div class="kpis">${kpis}</div>` : ""}
  ${sections}
  <footer>${escapeHtml(doc.footer ?? `Generated ${new Date().toLocaleString()}`)}</footer>
</body></html>`;
}

/** Opens a clean, print-optimised document. "Save as PDF" produces the PDF. */
export function printDocument(doc: PrintDocument) {
  const html = buildPrintHtml(doc);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const w = frame.contentWindow;
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();

  const run = () => {
    w.focus();
    w.print();
    setTimeout(() => frame.remove(), 1000);
  };
  if (w.document.readyState === "complete") setTimeout(run, 150);
  else frame.onload = () => setTimeout(run, 150);
}

export const exportPDF = printDocument;
