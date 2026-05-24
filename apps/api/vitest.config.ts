import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    clearMocks: true,
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 30_000,
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
    setupFiles: ['src/test/setup.ts'],
    testTimeout: 30_000,
  },
});
