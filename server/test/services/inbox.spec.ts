import { sandbox } from "../helper";

import { InboxMail } from "../../src/models/inbox-mail";
import { Mail } from "../../src/models/mail";
import { Inbox } from "../../src/services/inbox";

describe(Inbox.name, () => {
  describe("Inbox#of", () => {
    it("should return Inbox instance for given address", () => {
      const inbox = Inbox.of("hello@poo.email");
      expect(inbox).toBeInstanceOf(Inbox);
      expect(inbox.address).toEqual("hello@poo.email");
    });
  });

  describe("#reserved", () => {
    it("should return boolean value whether given inbox is reserved or not", () => {
      const inbox = new Inbox("admin@poo.email");
      expect(inbox.reserved).toEqual(true);
    });
  });

  describe("#add", () => {
    it("should create a new record to given inbox", async () => {
      const mail: Mail = {
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

      const inbox = new Inbox("foo@poo.email");

      const timer = sandbox.useFakeTimers({
        now: 1594759551000,
        toFake: ["Date"],
      });

      const added = await inbox.add(mail);
      expect(added).toBeInstanceOf(InboxMail);

      const record = await InboxMail.primaryKey.get(added.recipient, added.messageId);
      expect(record).toBeInstanceOf(InboxMail);
      expect(record?.recipient).toEqual(inbox.address);
      expect(record?.createdAt).toEqual(timer.now);
      expect(record?.expiresAt).toEqual(undefined);
      expect(record?.mail).toEqual(mail);
    });
  });

  describe("#list", () => {
    it("should return messages in given inbox", async () => {
      const recipient = "list@poo.email";
      const records = [1, 2, 3].map((v) => {
        const record = InboxMail.create({
          recipient,
          mail: {
            from: [{
              name: "Lorem",
              address: "lorem@example.com",
            }],
            to: [{
              name: "",
              address: "ipsum@example.com",
            }],
            date: v,
            subject: "subject",
            summary: "summary",
            content: {
              text: "message.txt",
              textAsHtml: "message-text.html",
              html: "message.html",
            },
          },
        });
        record.messageId = `M0000000${v}`;

        return record;
      });
      await InboxMail.writer.batchPut(records);

      const inbox = new Inbox(recipient);
      const res = await inbox.list();

      expect(res.data).toHaveLength(3);
      expect(res.data[0].recipient).toEqual(recipient);
      expect(res.data[0].mail).toEqual(records[2].mail);
      expect(res.data[1].recipient).toEqual(recipient);
      expect(res.data[1].mail).toEqual(records[1].mail);
      expect(res.data[2].recipient).toEqual(recipient);
      expect(res.data[2].mail).toEqual(records[0].mail);
      expect(res.paging).toEqual({});
    });
  });

  describe("#batchDelete", () => {
    it("should delete records", async () => {
      const recipient = "batch.delete@poo.email";
      const records = [1, 2, 3].map((v) => {
        const record = InboxMail.create({
          recipient,
          mail: {
            from: [{
              name: "Lorem",
              address: "lorem@example.com",
            }],
            to: [{
              name: "",
              address: "ipsum@example.com",
            }],
            date: v,
            subject: "subject",
            summary: "summary",
            content: {
              text: "message.txt",
              textAsHtml: "message-text.html",
              html: "message.html",
            },
          },
        });
        record.messageId = `M0000000${v}`;

        return record;
      });
      await InboxMail.writer.batchPut(records);

      const inbox = new Inbox(recipient);
      await inbox.batchDelete(
        records.map((record) => record.messageId),
      );

      const res = await InboxMail.primaryKey.batchGet(
        records.map((record) => [record.recipient, record.messageId]),
      );

      expect(res.records).toEqual([]);
    });
  });
});
