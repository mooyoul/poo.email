import * as sinon from "sinon";
import { sandbox } from "../helper";

import { Subscription } from "../../src/models/subscription";

describe(Subscription.name, () => {
  describe("#create", () => {
    let timer: sinon.SinonFakeTimers;

    beforeEach(() => {
      timer = sandbox.useFakeTimers({
        now: 1594851706000,
        toFake: ["Date"],
      });
    });

    it("should create Subscription instance", () => {
      const subscription = Subscription.create({
        topic: "t1",
        connectionId: "c1",
        ttl: 6 * 1000,
      });

      expect(subscription).toBeInstanceOf(Subscription);
      expect(subscription.topic).toEqual("t1");
      expect(subscription.connectionId).toEqual("c1");
      expect(subscription.createdAt).toEqual(timer.now);
      expect(subscription.expiresAt).toEqual(1594851712);
    });
  });
});
