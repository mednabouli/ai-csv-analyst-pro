import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["lib/**/*.ts", "app/actions/**/*.ts", "app/api/**/*.ts"],
      exclude: ["lib/db/**", "lib/auth-client.ts", "**/*.d.ts"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
    setupFiles: ["./vitest.setup.ts"],
  },
});
