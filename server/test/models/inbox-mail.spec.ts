import * as sinon from "sinon";
import { sandbox } from "../helper";

import { InboxMail } from "../../src/models/inbox-mail";

describe(InboxMail.name, () => {
  describe("#create", () => {
    let timer: sinon.SinonFakeTimers;

    const mail = {
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

    beforeEach(() => {
      timer = sandbox.useFakeTimers({
        now: 1594851706000,
        toFake: ["Date"],
      });
    });

    it("should create InboxMail instance", () => {
      const inboxMail = InboxMail.create({
        recipient: "ipsum@example.com",
        mail,
      });

      expect(inboxMail).toBeInstanceOf(InboxMail);
      expect(inboxMail.recipient).toEqual("ipsum@example.com");
      expect(inboxMail.mail).toEqual(mail);
      expect(inboxMail.createdAt).toEqual(timer.now);
      expect(inboxMail.expiresAt).toEqual(undefined);
    });

    it("should set TTL if provided", () => {
      const inboxMail = InboxMail.create({
        recipient: "ipsum@example.com",
        mail,
        ttl: 6 * 1000,
      });

      expect(inboxMail.expiresAt).toEqual(1594851712);
    });
  });
});
