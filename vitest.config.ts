import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
    // Limits resource usage in CI to avoid crashes
    maxWorkers: process.env.CI ? 2 : undefined,
    isolate: false, // Useful for many small logic tests
  },
});
