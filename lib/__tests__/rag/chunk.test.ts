import { describe, it, expect } from "vitest";
import { parseCSV, chunkRows, type CSVChunk } from "@/lib/rag/chunk";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeCSV(rows: Record<string, unknown>[], sep = ","): Buffer {
  const cols = Object.keys(rows[0] ?? {});
  const header = cols.join(sep);
  const body = rows.map((r) => cols.map((c) => String(r[c] ?? "")).join(sep)).join("\n");
  return Buffer.from(`${header}\n${body}`, "utf-8");
}

const SAMPLE_ROWS = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: +(Math.random() * 100).toFixed(2),
  category: ["Electronics", "Food", "Clothing"][i % 3],
  in_stock: i % 5 !== 0,
}));

// ── parseCSV ─────────────────────────────────────────────────────────────────
describe("parseCSV", () => {
  it("returns correct rowCount and columnCount", () => {
    const buf = makeCSV(SAMPLE_ROWS);
    const { meta } = parseCSV(buf);
    expect(meta.rowCount).toBe(120);
    expect(meta.columnCount).toBe(5);
  });

  it("returns correct column names", () => {
    const buf = makeCSV(SAMPLE_ROWS);
    const { meta } = parseCSV(buf);
    expect(meta.columns).toEqual(["id", "name", "price", "category", "in_stock"]);
  });

  it("casts numeric columns via dynamicTyping", () => {
    const buf = makeCSV([{ id: 1, value: 42.5 }]);
    const { data } = parseCSV(buf);
    expect(typeof data[0].id).toBe("number");
    expect(typeof data[0].value).toBe("number");
  });

  it("casts boolean columns via dynamicTyping", () => {
    const buf = makeCSV([{ flag: true }, { flag: false }]);
    const { data } = parseCSV(buf);
    expect(data[0].flag).toBe(true);
    expect(data[1].flag).toBe(false);
  });

  it("summary includes dataset line and column list", () => {
    const buf = makeCSV(SAMPLE_ROWS);
    const { meta } = parseCSV(buf);
    expect(meta.summary).toContain("120 rows x 5 columns");
    expect(meta.summary).toContain("id, name, price, category, in_stock");
  });

  it("summary includes first 3 sample rows", () => {
    const buf = makeCSV(SAMPLE_ROWS);
    const { meta } = parseCSV(buf);
    expect(meta.summary).toContain("Row 1:");
    expect(meta.summary).toContain("Row 2:");
    expect(meta.summary).toContain("Row 3:");
    expect(meta.summary).not.toContain("Row 4:");
  });

  it("throws on completely empty buffer", () => {
    expect(() => parseCSV(Buffer.from("", "utf-8"))).toThrow();
  });

  it("handles a single data row", () => {
    const buf = makeCSV([{ a: 1, b: "hello" }]);
    const { data, meta } = parseCSV(buf);
    expect(data).toHaveLength(1);
    expect(meta.rowCount).toBe(1);
  });

  it("handles missing values as empty strings", () => {
    const csv = "a,b,c\n1,,3";
    const { data } = parseCSV(Buffer.from(csv, "utf-8"));
    expect(data[0].b).toBeNull();
  });

  it("handles commas inside quoted fields", () => {
    const csv = \`name,description\n"Smith, John","A, B, C"\`;
    const { data, meta } = parseCSV(Buffer.from(csv, "utf-8"));
    expect(meta.columnCount).toBe(2);
    expect(data[0].name).toBe("Smith, John");
    expect(data[0].description).toBe("A, B, C");
  });

  it("skips empty lines", () => {
    const csv = "a,b\n1,2\n\n3,4\n";
    const { data } = parseCSV(Buffer.from(csv, "utf-8"));
    expect(data).toHaveLength(2);
  });
});

// ── chunkRows ────────────────────────────────────────────────────────────────
describe("chunkRows", () => {
  const cols = ["id", "name", "price", "category", "in_stock"];

  it("produces correct number of chunks for exact multiple", () => {
    const rows = SAMPLE_ROWS.slice(0, 100);
    const chunks = chunkRows(rows, cols, 50);
    expect(chunks).toHaveLength(2);
  });

  it("produces correct number of chunks with remainder", () => {
    const chunks = chunkRows(SAMPLE_ROWS, cols, 50); // 120 rows → 3 chunks
    expect(chunks).toHaveLength(3);
  });

  it("last chunk contains the remainder rows", () => {
    const chunks = chunkRows(SAMPLE_ROWS, cols, 50);
    expect(chunks[2].rowCount).toBe(20);
  });

  it("each chunk text starts with the CSV header", () => {
    const chunks = chunkRows(SAMPLE_ROWS, cols, 50);
    chunks.forEach((chunk) => {
      expect(chunk.text.startsWith(cols.join(","))).toBe(true);
    });
  });

  it("startRow is correct for each chunk", () => {
    const chunks = chunkRows(SAMPLE_ROWS, cols, 50);
    expect(chunks[0].startRow).toBe(0);
    expect(chunks[1].startRow).toBe(50);
    expect(chunks[2].startRow).toBe(100);
  });

  it("chunk text contains all columns as CSV rows", () => {
    const rows = [{ id: 1, name: "Widget", price: 9.99, category: "Tools", in_stock: true }];
    const chunks = chunkRows(rows, cols, 50);
    expect(chunks[0].text).toContain("1,Widget,9.99,Tools,true");
  });

  it("handles chunkSize larger than total rows", () => {
    const chunks = chunkRows(SAMPLE_ROWS, cols, 500);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].rowCount).toBe(120);
  });

  it("handles chunkSize of 1 (one row per chunk)", () => {
    const rows = SAMPLE_ROWS.slice(0, 5);
    const chunks = chunkRows(rows, cols, 1);
    expect(chunks).toHaveLength(5);
    chunks.forEach((c) => expect(c.rowCount).toBe(1));
  });

  it("handles empty rows array", () => {
    const chunks = chunkRows([], cols, 50);
    expect(chunks).toHaveLength(0);
  });

  it("total rows across all chunks equals input length", () => {
    const chunks = chunkRows(SAMPLE_ROWS, cols, 50);
    const total = chunks.reduce((sum: number, c: CSVChunk) => sum + c.rowCount, 0);
    expect(total).toBe(SAMPLE_ROWS.length);
  });

  it("handles special characters in values", () => {
    const rows = [{ a: "hello\nworld", b: "tab\there" }];
    const chunks = chunkRows(rows, ["a", "b"], 50);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].rowCount).toBe(1);
  });
});

// ── parseCSV + chunkRows integration ─────────────────────────────────────────
describe("parseCSV → chunkRows integration", () => {
  it("round-trips: total rows from chunks equals meta.rowCount", () => {
    const buf = makeCSV(SAMPLE_ROWS);
    const { data, meta } = parseCSV(buf);
    const chunks = chunkRows(data, meta.columns, 50);
    const total = chunks.reduce((sum: number, c: CSVChunk) => sum + c.rowCount, 0);
    expect(total).toBe(meta.rowCount);
  });

  it("column count matches chunk header column count", () => {
    const buf = makeCSV(SAMPLE_ROWS);
    const { data, meta } = parseCSV(buf);
    const chunks = chunkRows(data, meta.columns, 50);
    const headerCols = chunks[0].text.split("\n")[0].split(",").length;
    expect(headerCols).toBe(meta.columnCount);
  });
});
