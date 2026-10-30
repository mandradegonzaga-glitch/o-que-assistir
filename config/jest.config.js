export default {
  rootDir: '../',
  testEnvironment: 'node',
  transform: {},
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    '<rootDir>/src/domain/**/*.js',
    '<rootDir>/src/utils/**/*.js'
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80 }
  }
};
