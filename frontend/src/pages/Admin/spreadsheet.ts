export async function downloadSpreadsheet(
  filename: string,
  rows: string[][],
  sheetName: string,
) {
  const XLSX = (await import("@e965/xlsx/dist/xlsx.mini.min.js")).default;
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
