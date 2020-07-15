import { sandbox } from "../helper";

import { EpochIdentifier } from "../../src/models/core";

describe("Model Base", () => {
  describe(EpochIdentifier.name, () => {
    let identifier: EpochIdentifier;

    beforeEach(() => {
      identifier = new EpochIdentifier("I");
    });

    describe("#generate", () => {
      it("should use current timestamp if timestamp is not provided", () => {
        const timer = sandbox.useFakeTimers({
          now: 1594851706000,
          toFake: ["Date"],
        });

        expect(identifier.generate()).toEqual("I00MRJATS");
      });

      it("should generate identifier", () => {
        expect(identifier.generate(1594850000000)).toEqual("I00MQIQGW");
      });
    });

    describe("#parse", () => {
      it("should parse identifier", () => {
        expect(identifier.parse("I00MRJATS")).toEqual(1594851706000);
        expect(identifier.parse("I00MQIQGW")).toEqual(1594850000000);
      });
    });
  });
});

