import * as sinon from "sinon";
import { sandbox, stubAWSAPI } from "../helper";

import * as APIGatewayManagement from "aws-sdk/clients/apigatewaymanagementapi";

import { Subscription } from "../../src/models/subscription";
import { EventPushService } from "../../src/services/event-push";

describe(EventPushService.name, () => {
  describe("#broadcast", () => {
    let findByTopicFake: sinon.SinonSpy;
    let unsubscribeBatchFake: sinon.SinonSpy;

    beforeEach(() => {
      findByTopicFake = sinon.fake.resolves([
        Subscription.create({
          topic: "t20",
          connectionId: "c20",
          ttl: 30 * 1000,
        }),
        Subscription.create({
          topic: "t20",
          connectionId: "c21",
          ttl: 30 * 1000,
        }),
      ]);
      unsubscribeBatchFake = sinon.fake.resolves(undefined);
    });

    it("should send events to all subscribers", async () => {
      const postToConnectionFake = sinon.fake.resolves({});

      stubAWSAPI(APIGatewayManagement, "postToConnection", postToConnectionFake);

      const service = new EventPushService("https://fake.amazonaws.com/endpoint", {
        findByTopic: findByTopicFake,
        unsubscribeBatch: unsubscribeBatchFake,
      } as any);

      await service.broadcast("t20", { foo: "bar" });

      expect(postToConnectionFake.callCount).toEqual(2);
      expect(postToConnectionFake.firstCall.args).toEqual([
        { ConnectionId: "c20", Data: JSON.stringify({ foo: "bar" }) },
      ]);
      expect(postToConnectionFake.secondCall.args).toEqual([
        { ConnectionId: "c21", Data: JSON.stringify({ foo: "bar" }) },
      ]);

      expect(unsubscribeBatchFake.callCount).toEqual(0);
    });

    it("should unsubscribe topics on failure", async () => {
      const postToConnectionFake = sandbox.stub();
      postToConnectionFake.onFirstCall().rejects(new Error("MOCKED"));
      postToConnectionFake.onSecondCall().resolves({});

      stubAWSAPI(APIGatewayManagement, "postToConnection", postToConnectionFake);

      const service = new EventPushService("https://fake.amazonaws.com/endpoint", {
        findByTopic: findByTopicFake,
        unsubscribeBatch: unsubscribeBatchFake,
      } as any);

      await service.broadcast("t20", { foo: "bar" });

      expect(postToConnectionFake.callCount).toEqual(2);
      expect(postToConnectionFake.firstCall.args).toEqual([
        { ConnectionId: "c20", Data: JSON.stringify({ foo: "bar" }) },
      ]);
      expect(postToConnectionFake.secondCall.args).toEqual([
        { ConnectionId: "c21", Data: JSON.stringify({ foo: "bar" }) },
      ]);

      expect(unsubscribeBatchFake.callCount).toEqual(1);
      expect(unsubscribeBatchFake.firstCall.args).toEqual(["t20", ["c20"]]);
    });
  });

  describe("#send", () => {
    it("should send event to given connection", async () => {
      const postToConnectionFake = sinon.fake.resolves({});

      stubAWSAPI(APIGatewayManagement, "postToConnection", postToConnectionFake);

      const service = new EventPushService("https://fake.amazonaws.com/endpoint", {
        findByTopic: sinon.fake.resolves({}),
        unsubscribeBatch: sinon.fake.resolves({}),
      } as any);

      await service.send("c30", { hey: "hello" });

      expect(postToConnectionFake.callCount).toEqual(1);
      expect(postToConnectionFake.firstCall.args).toEqual([{
        ConnectionId: "c30",
        Data: JSON.stringify({ hey: "hello" }),
      }]);
    });
  });
});
