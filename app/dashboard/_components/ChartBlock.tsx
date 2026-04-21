import React from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

export interface ChartBlockProps {
  spec: {
    x: string;
    y: string;
    type: "bar" | "line" | "pie" | "scatter";
  };
  data: Record<string, unknown>[];
}

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#a4de6c", "#d0ed57", "#ffc0cb"
];

export function ChartBlock({ spec, data }: ChartBlockProps) {
  if (!data || data.length === 0) {
    return <div className="w-full h-96 flex items-center justify-center border rounded bg-muted"><span className="text-muted-foreground">No data to display</span></div>;
  }

  switch (spec.type) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={384}>
          <BarChart data={data}>
            <XAxis dataKey={spec.x} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={spec.y} fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      );
    case "line":
      return (
        <ResponsiveContainer width="100%" height={384}>
          <LineChart data={data}>
            <XAxis dataKey={spec.x} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={spec.y} stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      );
    case "pie":
      return (
        <ResponsiveContainer width="100%" height={384}>
          <PieChart>
            <Pie
              data={data}
              dataKey={spec.y}
              nameKey={spec.x}
              cx="50%"
              cy="50%"
              outerRadius={120}
              fill="#8884d8"
              label
            >
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    case "scatter":
      return (
        <ResponsiveContainer width="100%" height={384}>
          <ScatterChart>
            <XAxis dataKey={spec.x} name={spec.x} />
            <YAxis dataKey={spec.y} name={spec.y} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="Data" data={data} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    default:
      return <div className="w-full h-96 flex items-center justify-center border rounded bg-muted"><span className="text-muted-foreground">Unknown chart type: {spec.type}</span></div>;
  }
}
