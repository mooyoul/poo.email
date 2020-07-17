import { sandbox  } from "../helper";

import { handler } from "../../src/handlers/inbound-email";
import { InboxMail } from "../../src/models/inbox-mail";
import { Mail } from "../../src/models/mail";
import * as Presenters  from "../../src/presenters";
import { EventPushService } from "../../src/services/event-push";
import { Inbox } from "../../src/services/inbox";
import { MailImporter } from "../../src/services/mail-importer";

describe("Inbound Email Handler", () => {
  let mail: Mail;
  let importFake: sinon.SinonStub;
  let addFake: sinon.SinonStub;
  let broadcastFake: sinon.SinonStub;
  let mailShowPresentFake: sinon.SinonStub;

  beforeEach(() => {
    mail = {
      from: [{
        name: "Lorem",
        address: "lorem@example.com",
      }],
      to: [{
        name: "",
        address: "ipsum@example.com",
      }],
      date: 1234,
      subject: "subject",
      summary: "summary",
      content: {
        text: "message.txt",
        textAsHtml: "message-text.html",
        html: "message.html",
      },
    };

    importFake = sandbox.stub(MailImporter.prototype, "import")
      .resolves(mail);

    addFake = sandbox.stub(Inbox.prototype, "add")
      .resolves(InboxMail.create({
        recipient: "ipsum@example.com",
        mail,
      }));

    mailShowPresentFake = sandbox.stub(Presenters.MailShow, "present")
      .resolves({
        data: {
          MOCKED: true,
        },
      });

    broadcastFake = sandbox.stub(EventPushService.prototype, "broadcast")
      .resolves();
  });

  describe("when given recipient is reserved", () => {
    beforeEach(() => {
      sandbox.stub(Inbox, "of")
        .returns({
          reserved: true,
          add: addFake,
        } as any);
    });

    it("should import mail to inbox without TTL", async () => {
      await handler({
        Records: [{
          ses: {
            mail: {
              messageId: "message1",
            },
            receipt: {
              recipients: ["ipsum@example.com"],
            },
          },
        } as any],
      });

      expect(importFake.callCount).toEqual(1);
      expect(importFake.firstCall.args).toEqual(["raw/message1", "archived/message1"]);
      expect(addFake.callCount).toEqual(1);
      expect(addFake.firstCall.args).toEqual([mail]);
    });

    it("should not broadcast event", async () => {
      await handler({
        Records: [{
          ses: {
            mail: {
              messageId: "message1",
            },
            receipt: {
              recipients: ["ipsum@example.com"],
            },
          },
        } as any],
      });

      expect(broadcastFake.callCount).toEqual(0);
    });
  });

  describe("when given recipient is not reserved", () => {
    beforeEach(() => {
      sandbox.stub(Inbox, "of")
        .returns({
          reserved: false,
          add: addFake,
        } as any);
    });

    it("should import mail to inbox without TTL", async () => {
      await handler({
        Records: [{
          ses: {
            mail: {
              messageId: "message2",
            },
            receipt: {
              recipients: ["ipsum@example.com"],
            },
          },
        } as any],
      });

      expect(importFake.callCount).toEqual(1);
      expect(importFake.firstCall.args).toEqual(["raw/message2", "archived/message2"]);
      expect(addFake.callCount).toEqual(1);
      expect(addFake.firstCall.args).toEqual([mail, 86400000]);
    });

    it("should broadcast event", async () => {
      await handler({
        Records: [{
          ses: {
            mail: {
              messageId: "message2",
            },
            receipt: {
              recipients: ["ipsum@example.com"],
            },
          },
        } as any],
      });

      expect(broadcastFake.callCount).toEqual(1);
      expect(broadcastFake.firstCall.args).toEqual([
        "ipsum@example.com",
        {
          type: "mail_received",
          topic: "ipsum@example.com",
          data: {
            MOCKED: true,
          },
        },
      ]);
    });
  });
});
