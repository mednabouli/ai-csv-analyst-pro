import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportButton } from "./ExportButton";
import "@testing-library/jest-dom";

import type { Message } from "ai";
const baseMessages: Message[] = [
  { id: "1", role: "user", content: "Show me a chart." },
  { id: "2", role: "assistant", content: "Here is a chart." },
];

describe("ExportButton", () => {
  it("renders export button and menu", () => {
    render(<ExportButton messages={baseMessages} fileName="test.csv" />);
    const btn = screen.getByRole("button", { name: /export/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /copy as markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /download markdown file/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /download text file/i })).toBeInTheDocument();
  });

  it("copies markdown to clipboard", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    render(<ExportButton messages={baseMessages} fileName="test.csv" />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /copy as markdown/i }));
    await waitFor(() => {
      expect(screen.getByText(/copied!/i)).toBeInTheDocument();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("downloads markdown and text files", () => {
    render(<ExportButton messages={baseMessages} fileName="test.csv" />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    const mdBtn = screen.getByRole("menuitem", { name: /download markdown file/i });
    const txtBtn = screen.getByRole("menuitem", { name: /download text file/i });
    expect(mdBtn).toBeInTheDocument();
    expect(txtBtn).toBeInTheDocument();
  });

  it("shows chart export options if chartRef is provided", () => {
    const chartRef = { current: document.createElement("div") };
    render(<ExportButton messages={baseMessages} fileName="test.csv" chartRef={chartRef} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("menuitem", { name: /download chart svg/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /download chart png/i })).toBeInTheDocument();
  });
});
