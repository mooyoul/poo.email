import * as sinon from "sinon";
import { createResolver, sandbox } from "../helper";

import { InboxMail } from "../../src/models/inbox-mail";
import * as Presenters from "../../src/presenters";
import InboxRoute from "../../src/routes/inbox";
import { Inbox } from "../../src/services/inbox";

describe("Inbox Route", () => {
  describe("GET /inbox", () => {
    const resolve = createResolver([
      InboxRoute,
    ]);

    it("should return messages in given inbox", async () => {
      sandbox.mock(Presenters.MailPaginatedList)
        .expects("present")
        .once()
        .callsFake(async (input) => input);

      const listInboxFake = sinon.fake.resolves([
        InboxMail.create({
          recipient: "inbox@poo.email",
          mail: {
            from: [{
              name: "Lorem",
              address: "lorem@example.com",
            }],
            to: [{
              name: "",
              address: "ipsum@example.com",
            }],
            date: Date.now(),
            subject: "subject",
            summary: "summary",
            content: {
              text: "message.txt",
              textAsHtml: "message-text.html",
              html: "message.html",
            },
          },
        }),
      ]);

      sandbox.mock(Inbox)
        .expects("of")
        .returns({
          list: listInboxFake,
        } as any);

      const res = await resolve(
        "GET", "/inbox", { recipient: "inbox@poo.email" },
      );
    });
  });
});
