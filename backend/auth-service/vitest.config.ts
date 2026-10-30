import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['src/tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      HIBP_ENABLED: 'false',
      BCRYPT_ROUNDS: '4',
      RECUPERACAO_MAX_POR_JANELA: '1000',
      CORS_ORIGINS: 'https://painel.resolve.app',
      // A MFA vem desligada em produção; os testes a ligam para exercitar o fluxo.
      MFA_HABILITADO: 'true',
    },
  },
});
