module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testTimeout: 15000,
  globalSetup: "<rootDir>/test/setup.ts",
  globalTeardown: "<rootDir>/test/teardown.ts",
  testMatch: ["**/*.{spec,test}.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
};
