module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
};
