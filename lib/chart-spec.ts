import { z } from "zod";

export const chartSpecToolSchema = z.object({
  x_column: z.string(),
  y_column: z.string(),
  chart_type: z.enum(["bar", "line", "pie", "scatter"]),
});

export function buildChartSpecTool(columns: string[]) {
  return {
    description: "Generate a chart specification for the given columns.",
    parameters: chartSpecToolSchema,
    validate: (params: { x_column: string; y_column: string; chart_type: string }) => {
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
