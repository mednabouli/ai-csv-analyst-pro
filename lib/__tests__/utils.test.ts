import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  it("joins class names, skipping falsy values", () => {
    expect(cn("a", false, "b", undefined, "c", null)).toBe("a b c");
  });
  it("returns empty string if all values are falsy", () => {
    expect(cn(undefined, false, null)).toBe("");
  });
  it("returns single class if only one is truthy", () => {
    expect(cn(false, "x", null)).toBe("x");
  });
});
