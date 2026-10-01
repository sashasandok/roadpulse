/** Service tests in src/ (alerts are pure; trips run their SQL against a test database). */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/migrations/**', '!src/data-source.ts'],
  coverageDirectory: 'coverage',
};
