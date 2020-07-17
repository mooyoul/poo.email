import * as sinon from "sinon";
import { sandbox } from "../helper";

import { createReadStream } from "fs";

import { MailImporter } from "../../src/services/mail-importer";

describe(MailImporter.name, () => {
  describe("#import", () => {
    it("should inflate mail message and returns Mail", async () => {
      const readAsStreamFake = sandbox.spy(() => createReadStream("fixtures/plain.bin"));
      const writeFake = sinon.fake.resolves({
        bucket: "fake",
        key: "fake",
      });
      const importer = new MailImporter({
        storage: { write: writeFake, readAsStream: readAsStreamFake } as any,
        expiresInDays: 14,
        baseUrl: "https://example.com/",
      });

      const mail = await importer.import("source", "destination");

      expect(mail).toEqual({
        from: [{
          address: "mooyoul@gmail.com",
          name: "MooYoul Lee",
        }],
        bcc: undefined,
        cc: undefined,
        to: [{
          address: "someone@poo.email",
          name: "",
        }],
        date: 1594752352000,
        subject: "Hello World",
        content: {
          html: "fake",
          text: "fake",
          textAsHtml: "fake",
        },
        summary: "Content goes here\n",
        attachments: [],
      });

      expect(readAsStreamFake.callCount).toEqual(1);
      expect(readAsStreamFake.firstCall.args).toEqual(["source"]);

      expect(writeFake.callCount).toEqual(4);
      expect(writeFake.firstCall.args).toEqual([{
        key: "destination/message.txt",
        body: Buffer.from("Content goes here\n", "utf8"),
        metadata: {
          contentType: "text/plain; charset=utf-8",
          acl: "public-read",
          cacheControl: "public, max-age=1209600",
        },
      }]);
      expect(writeFake.secondCall.args).toEqual([{
        key: "destination/message-text.html",
        body: Buffer.from("<p>Content goes here</p>", "utf8"),
        metadata: {
          contentType: "text/html; charset=utf-8",
          acl: "public-read",
          cacheControl: "public, max-age=1209600",
        },
      }]);
      expect(writeFake.thirdCall.args).toEqual([{
        key: "destination/message.html",
        body: Buffer.from("<div>Content goes here</div>\n", "utf8"),
        metadata: {
          contentType: "text/html; charset=utf-8",
          acl: "public-read",
          cacheControl: "public, max-age=1209600",
        },
      }]);
    });
  });
});
