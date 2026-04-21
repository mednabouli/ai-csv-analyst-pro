
import { z } from "zod";
import Papa from "papaparse";

export const chartSpecToolSchema = z.object({
  x_column: z.string(),
  y_column: z.string(),
  chart_type: z.enum(["bar", "line", "pie", "scatter"]),
});

export type ChartSpec = z.infer<typeof chartSpecToolSchema>;

export function buildChartSpecTool(columns: string[]) {
  return {
    description: "Generate a chart specification for the given columns.",
    parameters: chartSpecToolSchema,
    validate: (params: { x_column: string; y_column: string; chart_type: string }) => {
      if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error("No columns provided");
      }
      if (!columns.includes(params.x_column) || !columns.includes(params.y_column)) {
        throw new Error("x_column or y_column not in session columns");
      }
      // Explicitly check chart_type is valid (defensive, matches test)
      const validTypes = ["bar", "line", "pie", "scatter"];
      if (!validTypes.includes(params.chart_type)) {
        throw new Error("Unknown chart type");
      }
      return params;
    },
    run: async (params: { x_column: string; y_column: string; chart_type: string }) => {
      // This is a stub. Actual chart spec logic goes here.
      return {
        spec: {
          x: params.x_column,
          y: params.y_column,
          type: params.chart_type,
        },
      };
    },
  };
}

/**
 * Parses rows from an array of chunk objects (with .text), returns up to 200 rows.
 * Each chunk.text is a CSV string with header row.
 */
export function parseRowsFromChunks(chunks: { text: string }[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const chunk of chunks) {
    const parsed = Papa.parse<Record<string, unknown>>(chunk.text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    if (Array.isArray(parsed.data)) {
      for (const row of parsed.data) {
        if (rows.length < 200) {
          rows.push(row);
        } else {
          return rows;
        }
      }
    }
    if (rows.length >= 200) break;
  }
  return rows;
}
