"use client";
import React, { useState, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";


export interface ChartBlockProps {
  spec: {
    x: string;
    y: string;
    type: "bar" | "line" | "pie" | "scatter";
  };
  data: Record<string, unknown>[];
  insight?: string;
}

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#a4de6c", "#d0ed57", "#ffc0cb"
];

const CHART_TYPES = [
  { label: "Bar", value: "bar" },
  { label: "Line", value: "line" },
  { label: "Pie", value: "pie" },
  { label: "Scatter", value: "scatter" },
];

export function ChartBlock({ spec, data, insight }: ChartBlockProps) {
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "scatter">(
    CHART_TYPES.some(t => t.value === spec.type) ? spec.type : "bar"
  );
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return <div className="w-full h-96 flex items-center justify-center border rounded bg-muted"><span className="text-muted-foreground">No data to display</span></div>;
  }

  // Copy chart as image (SVG to clipboard)
  async function copyChartImage() {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector("svg");
    if (!svg) return;
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      // Try clipboard API for SVG
      if (navigator.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({ "image/svg+xml": blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      // Fallback: copy SVG as text
      await navigator.clipboard.writeText(svgString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopied(false);
      alert("Copy failed: " + (err as Error).message);
    }
  }

  // Download chart as PNG
  async function downloadChartPng() {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector("svg");
    if (!svg) return;
    setDownloading(true);
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      // Create image
      const img = new window.Image();
      const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = svg.width.baseVal.value || 800;
        canvas.height = svg.height.baseVal.value || 384;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "chart.png";
              a.click();
              URL.revokeObjectURL(a.href);
            }
            setDownloading(false);
          }, "image/png");
        } else {
          setDownloading(false);
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        setDownloading(false);
        URL.revokeObjectURL(url);
        alert("Failed to render chart image.");
      };
      img.src = url;
    } catch (err) {
      setDownloading(false);
      alert("PNG export failed: " + (err as Error).message);
    }
  }

  let chartLabel = "";
  switch (chartType) {
    case "bar": chartLabel = `Bar chart for ${spec.x} vs ${spec.y}`; break;
    case "line": chartLabel = `Line chart for ${spec.x} vs ${spec.y}`; break;
    case "pie": chartLabel = `Pie chart for ${spec.x}`; break;
    case "scatter": chartLabel = `Scatter chart for ${spec.x} vs ${spec.y}`; break;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          {CHART_TYPES.map(t => (
            <Button
              key={t.value}
              variant={chartType === t.value ? "default" : "outline"}
              size="sm"
              aria-pressed={chartType === t.value}
              aria-label={`Switch to ${t.label} chart`}
              onClick={() => setChartType(t.value as any)}
              className="capitalize"
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label="Copy chart image"
            onClick={copyChartImage}
            className="flex items-center gap-1"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy chart image"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Download chart as PNG"
            onClick={downloadChartPng}
            className="flex items-center gap-1"
            disabled={downloading}
          >
            <Download className="w-4 h-4" />
            {downloading ? "Downloading..." : "Download PNG"}
          </Button>
        </div>
      </div>
      <div ref={chartRef} className="w-full h-96 border rounded bg-background flex items-center justify-center">
        {chartType === "bar" && (
                  )}
                  {chartType === "scatter" && (
                    <ResponsiveContainer width="100%" height={384}>
                      <ScatterChart>
                        <XAxis dataKey={spec.x} name={spec.x} />
                        <YAxis dataKey={spec.y} name={spec.y} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                        <Scatter name="Data" data={data} fill="#8884d8" />
                      </ScatterChart>
                    </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={384}>
            <BarChart data={data}>
              <XAxis dataKey={spec.x} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={spec.y} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
        {chartType === "line" && (
          <ResponsiveContainer width="100%" height={384}>
            <LineChart data={data}>
              <XAxis dataKey={spec.x} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={spec.y} stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        )}
        {chartType === "pie" && (
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
        )}
      </div>
      <div className="mt-2 text-xs text-muted-foreground" aria-label="chart type label">{chartLabel}</div>
      {typeof data.length === "number" && (
        <div className="text-xs text-muted-foreground">Data length: {data.length}</div>
      )}
      {insight && (
        <div className="mt-3 px-2 py-2 rounded bg-muted text-sm text-muted-foreground border" data-testid="chart-insight-caption">
          {insight}
        </div>
      )}
    </div>
  );
}
