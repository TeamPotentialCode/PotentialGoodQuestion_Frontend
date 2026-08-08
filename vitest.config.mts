import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // vite-tsconfig-paths 대신 직접 연결한다. 의존성이 하나 줄고 결과는 같다
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/core/**/*.test.ts'],
    reporters: 'default',
  },
});
