/**
 * Utilitas spreadsheet bersama untuk panel admin dan guru.
 *
 * Library SheetJS (@e965/xlsx, build "mini") hanya dimuat saat dibutuhkan
 * (dynamic import) sehingga tidak ikut membebani chunk utama aplikasi.
 */
type XlsxModule = typeof import("@e965/xlsx");

let xlsxModulePromise: Promise<XlsxModule> | null = null;

export function loadXlsx(): Promise<XlsxModule> {
  xlsxModulePromise ??= import("@e965/xlsx/dist/xlsx.mini.min.js").then((module) => {
    const candidate = module as unknown as XlsxModule & { default?: XlsxModule };
    return candidate.default ?? candidate;
  });
  return xlsxModulePromise;
}

export type SpreadsheetCell = string | number;

export async function downloadSpreadsheet(
  filename: string,
  rows: SpreadsheetCell[][],
  sheetName = "Data",
): Promise<void> {
  const XLSX = await loadXlsx();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/**
 * Membaca lembar kerja pertama dari file .xlsx sebagai baris-baris string.
 * Mengembalikan null jika file tidak memiliki lembar kerja.
 */
export async function readFirstSheetRows(file: File): Promise<string[][] | null> {
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return null;
  return XLSX.utils.sheet_to_json<string[]>(firstSheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

/** Parser CSV sederhana (mendukung pemisah koma/titik koma dan tanda kutip). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (character === "," || character === ";")) {
      row.push(value.trim());
      value = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

/** Membaca file .csv atau .xlsx menjadi baris-baris string. */
export async function readSpreadsheetFile(file: File): Promise<string[][] | null> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    return parseCsv(await file.text());
  }
  return readFirstSheetRows(file);
}
