import * as XLSX from "xlsx";

/**
 * Exports data to a CSV file and triggers a browser download.
 * @param data Array of objects to be exported.
 * @param filename Name of the file (e.g., "export.csv").
 */
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","), // Header row
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = row[header];
          // Handle values that might contain commas
          const escaped = ("" + val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports data to an Excel file and triggers a browser download.
 * @param data Array of objects to be exported.
 * @param filename Name of the file (e.g., "export.xlsx").
 * @param sheetName Name of the worksheet.
 */
export function exportToExcel(
  data: any[],
  filename: string,
  sheetName = "Sheet1"
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
