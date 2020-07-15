import * as sinon from "sinon";
import { createResolver, sandbox } from "../helper";

import * as Presenters from "../../src/presenters";
import MessagesRoute from "../../src/routes/messages";
import { EventPushService } from "../../src/services/event-push";
import { Inbox } from "../../src/services/inbox";

describe("Messages Route", () => {
  describe("DELETE /messages/_batch", () => {
    const resolve = createResolver([
      MessagesRoute,
    ]);

    it("should delete specified messages", async () => {
      const recipient = "batch.delete@poo.email";
      const messageIds = ["M10", "M11"];

      sandbox.mock(Presenters.Succeed)
        .expects("present")
        .once()
        .callsFake(async (input) => input);

      const batchDeleteFake = sinon.fake.resolves({});

      sandbox.mock(Inbox)
        .expects("of")
        .returns({
          batchDelete: batchDeleteFake,
        } as any);

      const broadcastStub = sandbox.stub(EventPushService.prototype, "broadcast")
        .resolves();

      const res = await resolve("DELETE", "/messages/_batch", undefined, undefined, JSON.stringify({
        request: {
          recipient,
          messageIds,
        },
      }));

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual("true");

      expect(broadcastStub.callCount).toEqual(1);
      expect(broadcastStub.firstCall.args).toEqual([
        recipient, {
          topic: recipient,
          type: "mail_deleted",
          data: messageIds,
        },
      ]);
    });
  });
});
