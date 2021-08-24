module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFiles: ['<rootDir>/testSetup.js'],
};
