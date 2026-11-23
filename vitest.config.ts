import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Testes de funções puras em src/; o alias @ vale como no Next.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
});
