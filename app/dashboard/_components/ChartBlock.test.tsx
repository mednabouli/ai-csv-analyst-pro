import React from "react";
import { render, screen } from "@testing-library/react";
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
});
