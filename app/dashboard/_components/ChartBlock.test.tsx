  it("renders scatter chart and label", () => {
    render(<ChartBlock {...baseProps} spec={{ ...baseProps.spec, type: "scatter" }} />);
    expect(screen.getByText(/scatter chart for foo vs bar/i)).toBeInTheDocument();
  });
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChartBlock, ChartBlockProps } from "./ChartBlock";
import "@testing-library/jest-dom";

describe("ChartBlock", () => {
  const baseProps: ChartBlockProps = {
    spec: { x: "foo", y: "bar", type: "bar" },
    data: [
      { foo: 1, bar: 2 },
      { foo: 3, bar: 4 },
    ],
  };

  it("renders chart type and axes", () => {
    render(<ChartBlock {...baseProps} />);
    expect(screen.getByText(/bar chart for foo vs bar/i)).toBeInTheDocument();
    expect(screen.getByText(/data length: 2/i)).toBeInTheDocument();
  });

  it("renders correct chart type label", () => {
    render(<ChartBlock {...baseProps} spec={{ ...baseProps.spec, type: "pie" }} />);
    expect(screen.getByText(/pie chart/i)).toBeInTheDocument();
  });

  it("shows chart type switcher and switches chart type", () => {
    render(<ChartBlock {...baseProps} />);
    // Should see all chart type buttons
    expect(screen.getByRole("button", { name: /bar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /line/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pie/i })).toBeInTheDocument();
    // Switch to line
    fireEvent.click(screen.getByRole("button", { name: /line/i }));
    expect(screen.getByText(/line chart for foo vs bar/i)).toBeInTheDocument();
    // Switch to pie
    fireEvent.click(screen.getByRole("button", { name: /pie/i }));
    expect(screen.getByText(/pie chart for foo/i)).toBeInTheDocument();
  });

  it("renders insight caption when provided", () => {
    render(<ChartBlock {...baseProps} insight="This is an insight." />);
    expect(screen.getByTestId("chart-insight-caption")).toHaveTextContent("This is an insight.");
  });

  it("shows copy chart image button and feedback", async () => {
    render(<ChartBlock {...baseProps} />);
    const copyBtn = screen.getByRole("button", { name: /copy chart image/i });
    expect(copyBtn).toBeInTheDocument();
    // Simulate click (clipboard API is mocked in test env)
    fireEvent.click(copyBtn);
    // Feedback: Copied!
    await waitFor(() => {
      expect(screen.getByText(/copied!/i)).toBeInTheDocument();
    });
  });
});
