import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/utils/**/*.ts',
        'src/services/denunciaService.ts',
        'src/middlewares/**/*.ts',
      ],
      exclude: [
        'src/tests/**',
      ],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage-unit',
    },
  },
});
