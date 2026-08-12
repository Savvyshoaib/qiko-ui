import * as XLSX from "xlsx";
import type { WorkbookCell, WorkbookParseResult } from "./financialTypes";

const STATEMENT_MATRIX_SHEETS = new Set(["Rent Sta", "Exp Sta", "SC Sta"]);

function normalizeRawCell(value: unknown): WorkbookCell {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseSheetRows(worksheet: XLSX.WorkSheet): WorkbookCell[][] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: null,
  });
  return rows.map((row) => row.map((cell) => normalizeRawCell(cell)));
}

function toSheetType(sheetName: string): "tabular" | "statement_matrix" {
  return STATEMENT_MATRIX_SHEETS.has(sheetName) ? "statement_matrix" : "tabular";
}

function parseWorkbookFromXlsx(file: File, workbook: XLSX.WorkBook): WorkbookParseResult {
  const orderedSheetNames = workbook.SheetNames.slice();
  const sheets: Record<string, { type: "tabular" | "statement_matrix"; headers?: string[]; rows: WorkbookCell[][] }> = {};

  orderedSheetNames.forEach((sheetName) => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;
    const rawRows = parseSheetRows(ws);
    const sheetType = toSheetType(sheetName);

    if (sheetType === "tabular") {
      const headers = (rawRows[0] ?? []).map((c) => (c === null ? "" : String(c)));
      const rows = rawRows.slice(1);
      sheets[sheetName] = { type: sheetType, headers, rows };
    } else {
      sheets[sheetName] = { type: sheetType, rows: rawRows };
    }
  });

  return {
    fileType: file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx",
    workbook: {
      sheetOrder: orderedSheetNames,
      sheets,
    },
  };
}

export async function parseFinancialWorkbook(file: File): Promise<WorkbookParseResult> {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
    throw new Error("Only .xlsx and .csv files are supported");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellNF: true,
    cellText: true,
  });
  return parseWorkbookFromXlsx(file, workbook);
}
