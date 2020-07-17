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

    beforeEach(() => {
      sandbox.mock(Presenters.MailPaginatedList)
        .expects("present")
        .once()
        .callsFake(async (input: any) => ({
          data: input.data.map((mail: InboxMail) => mail.messageId),
          paging: input.paging,
        }));
    });

    describe("when given inbox is reserved", () => {
      it("should return empty list", async () => {
        sandbox.mock(Inbox)
          .expects("of")
          .returns({
            reserved: true,
          } as any);

        const res = await resolve(
          "GET", "/inbox", { recipient: "inbox@poo.email" },
        );

        expect(res.statusCode).toEqual(200);
        const body = JSON.parse(res.body);

        expect(body).toEqual({
          data: [],
          paging: {},
        });
      });
    });

    describe("when given inbox is not reserved", () => {
      it("should return messages in given inbox", async () => {
        const mails = [
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
        ];

        const listInboxFake = sinon.fake.resolves({
          data: mails,
          paging: {
            after: "after",
          },
        });

        sandbox.mock(Inbox)
          .expects("of")
          .returns({
            list: listInboxFake,
          } as any);

        const res = await resolve(
          "GET", "/inbox", { recipient: "inbox@poo.email" },
        );

        expect(res.statusCode).toEqual(200);
        const body = JSON.parse(res.body);

        expect(body.data).toEqual([mails[0].messageId]);
        expect(body.paging).toEqual({
          after: "after",
        });
      });
    });
  });
});
