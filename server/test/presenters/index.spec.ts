import * as Presenters from "../../src/presenters";

import { InboxMail } from "../../src/models/inbox-mail";

describe("Presenters", () => {
  describe("Schemas", () => {
    it("should export Mail Schema", () => {
      expect(Presenters.Schemas).toHaveProperty("Mail");
    });

    it("should export Success Schema", () => {
      expect(Presenters.Schemas).toHaveProperty("Success");
    });
  });

  describe("MailShow", () => {
    it("should present MailShow entity", async () => {
      const input = InboxMail.create({
        recipient: "ipsum@example.com",
        mail: {
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
        },
      });

      const rendered = await Presenters.MailShow.present(input);

      expect(rendered).toEqual({
        data: {
          recipient: "ipsum@example.com",
          messageId: input.messageId,
          from: [{
            name: "Lorem",
            address: "lorem@example.com",
          }],
          to: [{
            name: "",
            address: "ipsum@example.com",
          }],
          bcc: undefined,
          date: 1234,
          subject: "subject",
          summary: "summary",
          content: {
            text: "https://a.example.com/message.txt",
            textAsHtml: "https://a.example.com/message-text.html",
            html: "https://a.example.com/message.html",
          },
          attachments: undefined,
        },
      });
    });
  });

  describe("MailPaginatedList", () => {
    it("should present MailPaginatedList entity", async () => {
      const input = {
        data: [
          InboxMail.create({
            recipient: "ipsum@example.com",
            mail: {
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
            },
          }),
        ],
        paging: {
          after: "cursor",
        },
      };

      const rendered = await Presenters.MailPaginatedList.present(input);

      expect(rendered).toEqual({
        data: [{
          recipient: "ipsum@example.com",
          messageId: input.data[0].messageId,
          from: [{
            name: "Lorem",
            address: "lorem@example.com",
          }],
          to: [{
            name: "",
            address: "ipsum@example.com",
          }],
          bcc: undefined,
          date: 1234,
          subject: "subject",
          summary: "summary",
          content: {
            text: "https://a.example.com/message.txt",
            textAsHtml: "https://a.example.com/message-text.html",
            html: "https://a.example.com/message.html",
          },
          attachments: undefined,
        }],
        paging: {
          after: "cursor",
        },
      });
    });
  });

  describe("Succeed", () => {
    it("should present Succeed entity", async () => {
      const rendered = await Presenters.Succeed.present(true);

      expect(rendered).toEqual({
        data: {
          success: true,
        },
      });
    });
  });
});
