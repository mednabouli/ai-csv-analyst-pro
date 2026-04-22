// Utility function for className concatenation (shadcn/ui pattern)
export function cn(...inputs: (string | undefined | false | null)[]): string {
  return inputs.filter(Boolean).join(" ");
}
