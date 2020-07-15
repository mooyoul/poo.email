import { ReservedUsernames } from "../../src/values/reserved-names";

describe("ReservedUsernames", () => {
  it("should contain reserved username", () => {
    expect(ReservedUsernames.has("admin")).toEqual(true);
  });
});
