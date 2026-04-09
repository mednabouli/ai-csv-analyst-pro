import Papa from "papaparse";

export interface CSVChunk {
  text: string;
  rowCount: number;
  startRow: number;
}

export interface CSVMeta {
  columns: string[];
  rowCount: number;
  columnCount: number;
  summary: string;
}

export function parseCSV(bytes: Buffer): { data: Record<string, unknown>[]; meta: CSVMeta } {
  const csv = bytes.toString("utf-8");
  const result = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const columns = result.meta.fields ?? [];
  if (columns.length === 0) throw new Error("CSV is empty or has no headers");
  const summary = buildSummary(result.data, columns);

  return {
    data: result.data,
    meta: {
      columns,
      rowCount: result.data.length,
      columnCount: columns.length,
      summary,
    },
  };
}

function buildSummary(data: Record<string, unknown>[], columns: string[]): string {
  const lines: string[] = [
    `Dataset: ${data.length} rows x ${columns.length} columns`,
    `Columns: ${columns.join(", ")}`,
    `Sample (first 3 rows):`,
    ...data.slice(0, 3).map((r, i) => `  Row ${i + 1}: ${JSON.stringify(r)}`),
  ];
  return lines.join("\n");
}

export function chunkRows(data: Record<string, unknown>[], columns: string[], chunkSize = 50): CSVChunk[] {
  const chunks: CSVChunk[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    const slice = data.slice(i, i + chunkSize);
    const header = columns.join(",");
    const rows = slice.map(r => columns.map(c => String(r[c] ?? "")).join(",")).join("\n");
    chunks.push({
      text: `${header}
${rows}`,
      rowCount: slice.length,
      startRow: i,
    });
  }
  return chunks;
}
