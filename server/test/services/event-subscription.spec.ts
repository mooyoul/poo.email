import * as sinon from "sinon";
import { sandbox } from "../helper";

import { Subscription } from "../../src/models/subscription";
import { EventSubscriptionService } from "../../src/services/event-subscription";

describe(EventSubscriptionService.name, () => {
  let service: EventSubscriptionService;
  let timer: sinon.SinonFakeTimers;

  beforeEach(() => {
    service = new EventSubscriptionService();

    timer = sandbox.useFakeTimers({
      now: 1563094800000,
      toFake: ["Date"],
    });
  });

  describe("#findByTopic", () => {
    it("should return subscriptions under given topic", async () => {
      const topic = "t1";

      const records = ["c1", "c2", "c3"].map((fakeId) =>
        Subscription.create({
          topic,
          connectionId: fakeId,
          ttl: 1000 * 30,
        }),
      );

      await Subscription.writer.batchPut(records);

      const subscriptions = await service.findByTopic(topic);

      expect(subscriptions).toHaveLength(3);

      expect(subscriptions[0].topic).toEqual(topic);
      expect(subscriptions[0].connectionId).toEqual("c1");
      expect(subscriptions[0].createdAt).toEqual(timer.now);
      expect(subscriptions[0].expiresAt).toEqual(1563094830);

      expect(subscriptions[1].topic).toEqual(topic);
      expect(subscriptions[1].connectionId).toEqual("c2");
      expect(subscriptions[1].createdAt).toEqual(timer.now);
      expect(subscriptions[1].expiresAt).toEqual(1563094830);

      expect(subscriptions[2].topic).toEqual(topic);
      expect(subscriptions[2].connectionId).toEqual("c3");
      expect(subscriptions[2].createdAt).toEqual(timer.now);
      expect(subscriptions[2].expiresAt).toEqual(1563094830);
    });
  });

  describe("#findByConnectionId", () => {
    it("should return subscriptions under given connection id", async () => {
      const connectionId = "c4";

      const records = [
        Subscription.create({
          topic: "t3",
          connectionId,
          ttl: 1000 * 30,
        }),
        Subscription.create({
          topic: "t4",
          connectionId,
          ttl: 1000 * 30,
        }),
        Subscription.create({
          topic: "t3",
          connectionId: "c5",
          ttl: 1000 * 30,
        }),
      ];

      await Subscription.writer.batchPut(records);

      const subscriptions = await service.findByConnectionId(connectionId);

      expect(subscriptions).toHaveLength(2);

      expect(subscriptions[0].topic).toEqual("t3");
      expect(subscriptions[0].connectionId).toEqual(connectionId);
      expect(subscriptions[0].createdAt).toEqual(timer.now);
      expect(subscriptions[0].expiresAt).toEqual(1563094830);

      expect(subscriptions[1].topic).toEqual("t4");
      expect(subscriptions[1].connectionId).toEqual(connectionId);
      expect(subscriptions[1].createdAt).toEqual(timer.now);
      expect(subscriptions[1].expiresAt).toEqual(1563094830);
    });
  });

  describe("#subscribe",  () => {
    it("should create a new Subscription record", async () => {
      const subscription = await service.subscribe("t10", "c10");
      expect(subscription).toBeInstanceOf(Subscription);
      expect(subscription.topic).toEqual("t10");
      expect(subscription.connectionId).toEqual("c10");

      const record = await Subscription.primaryKey.get("t10", "c10");
      expect(record).toBeInstanceOf(Subscription);
      expect(record?.topic).toEqual("t10");
      expect(record?.connectionId).toEqual("c10");
      expect(record?.createdAt).toEqual(timer.now);
      expect(record?.expiresAt).toEqual(1563102000);
    });
  });

  describe("#unsubscribe", () => {
    it("should delete a Subscription record", async () => {
      await Subscription.writer.put(
        Subscription.create({
          topic: "t11",
          connectionId: "c11",
          ttl: 1000 * 30,
        }),
      );

      await service.unsubscribe("t11", "c11");

      const record = await Subscription.primaryKey.get("t11", "c11");
      expect(record).toEqual(null);
    });
  });

  describe("#unsubscribeBatch", () => {
    it("should delete Subscription records", async () => {
      await Subscription.writer.batchPut([
        Subscription.create({
          topic: "t12",
          connectionId: "c12",
          ttl: 1000 * 30,
        }),
        Subscription.create({
          topic: "t12",
          connectionId: "c13",
          ttl: 1000 * 30,
        }),
      ]);

      await service.unsubscribeBatch("t12", ["c12", "c13"]);
      const res = await Subscription.primaryKey.batchGet([
        ["t12", "c12"],
        ["t12", "c13"],
      ]);

      expect(res.records).toEqual([]);
    });
  });

  describe("#clear", () => {
    it("should delete all subscriptions under given connection id", async () => {
      await Subscription.writer.batchPut([
        Subscription.create({
          topic: "t13",
          connectionId: "c14",
          ttl: 1000 * 30,
        }),
        Subscription.create({
          topic: "t14",
          connectionId: "c14",
          ttl: 1000 * 30,
        }),
      ]);

      await service.clear("c14");
      const records = await Subscription.primaryKey.batchGet([
        ["t13", "c14"],
        ["t14", "c14"],
      ]);

      expect(records.records).toEqual([]);
    });
  });
});
