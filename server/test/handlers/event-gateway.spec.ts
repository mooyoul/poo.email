import { sandbox } from "../helper";

import { handler } from "../../src/handlers/event-gateway";
import { EventPushService } from "../../src/services/event-push";
import { EventSubscriptionService } from "../../src/services/event-subscription";

describe("EventGateway Handler", () => {
  describe("when event payload is missing", () => {
    it("should ignore event", async () => {
      const res = await handler({
        requestContext: {
          connectionId: "fakeCID",
          eventType: "MESSAGE",
        },
      } as any);

      expect(res).toEqual({
        statusCode: 200,
        body: "",
      });
    });
  });

  describe("for ping request", () => {
    it("should reply pong", async () => {
      const sendFake = sandbox.stub(EventPushService.prototype, "send")
        .resolves();

      await expect(
        handler({
          requestContext: {
            connectionId: "fakeCID",
            eventType: "MESSAGE",
          },
          body: JSON.stringify({
            type: "ping",
          }),
        } as any),
      ).resolves.not.toThrowError();

      expect(sendFake.callCount).toEqual(1);
      expect(sendFake.firstCall.args).toEqual(["fakeCID", {
        type: "pong",
      }]);
    });
  });

  describe("for subscribe request", () => {
    it("should subscribe topic", async () => {
      const subscribeFake = sandbox.stub(EventSubscriptionService.prototype, "subscribe")
        .resolves();

      await expect(
        handler({
          requestContext: {
            connectionId: "fakeCID",
            eventType: "MESSAGE",
          },
          body: JSON.stringify({
            type: "subscribe",
            data: {
              topic: "fakeTopic",
            },
          }),
        } as any),
      ).resolves.not.toThrowError();

      expect(subscribeFake.callCount).toEqual(1);
      expect(subscribeFake.firstCall.args).toEqual(["fakeTopic", "fakeCID"]);
    });
  });

  describe("for unsubscribe request", () => {
    it("should unsubscribe topic", async () => {
      const unsubscribeFake = sandbox.stub(EventSubscriptionService.prototype, "unsubscribe")
        .resolves();

      await expect(
        handler({
          requestContext: {
            connectionId: "fakeCID",
            eventType: "MESSAGE",
          },
          body: JSON.stringify({
            type: "unsubscribe",
            data: {
              topic: "fakeTopic",
            },
          }),
        } as any),
      ).resolves.not.toThrowError();

      expect(unsubscribeFake.callCount).toEqual(1);
      expect(unsubscribeFake.firstCall.args).toEqual(["fakeTopic", "fakeCID"]);
    });
  });

  describe("for disconnected event", () => {
    it("should clear all subscriptions", async () => {
      const clearFake = sandbox.stub(EventSubscriptionService.prototype, "clear")
        .resolves();

      await expect(
        handler({
          requestContext: {
            connectionId: "fakeCID",
            eventType: "DISCONNECT",
          },
        } as any),
      ).resolves.not.toThrowError();

      expect(clearFake.callCount).toEqual(1);
      expect(clearFake.firstCall.args).toEqual(["fakeCID"]);
    });
  });
});
