import * as nock from "nock";
import * as sinon from "sinon";
import { readStream, sandbox } from "../helper";

import { createReadStream, promises as fs } from "fs";
import { Readable } from "stream";

import { MailImporter } from "../../src/services/mail-importer";

const BUF_TRANSPARENT_GIF = Buffer.from("R0lGODlhAQABAIAAAP///8DAwCH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==", "base64");

describe(MailImporter.name, () => {
  describe("#import", () => {
    beforeEach(() => {
      nock.disableNetConnect();
    });

    afterEach(() => {
      nock.enableNetConnect();
      nock.cleanAll();
    });

    describe("basic", () => {
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
          body: Buffer.from("<html><head></head><body><div>Content goes here</div>\n</body></html>", "utf8"),
          metadata: {
            contentType: "text/html; charset=utf-8",
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        }]);
      });
    });

    describe("prevent read tracking", () => {
      it("should immediately proxy image and import mail", async () => {
        const scope = nock("https://confirm.mail.kakao.com")
          .get("/v1/users/debug%40kakao%2Ecom/cmails/20200719035853%2E-ztVoEEkSBa34a7ZhNOM4w%40debug%2Ekakao%2Ecom/recipients/someone%40poo%2Eemail")
          .reply(200, BUF_TRANSPARENT_GIF, { "Content-Type": "image/gif" });

        const readAsStreamFake = sandbox.spy(() => createReadStream("fixtures/read-tracking-pixel-image.bin"));
        const writeFake = sinon.fake.resolves({
          bucket: "fake",
          key: "fake",
        });
        const importer = new MailImporter({
          storage: { write: writeFake, readAsStream: readAsStreamFake } as any,
          expiresInDays: 14,
          baseUrl: "https://example.com/",
        });

        const randomFake = sandbox.stub(Math, "random")
          .returns(0.003984116173610941);

        const mail = await importer.import("source", "destination");

        randomFake.restore();

        expect(mail).toEqual({
          from: [{
            address: "debug@kakao.com",
            name: "debug",
          }],
          bcc: undefined,
          cc: undefined,
          to: [{
            address: "someone@poo.email",
            name: "",
          }],
          date: 1595098733000,
          subject: "Will you read my mail?",
          content: {
            html: "fake",
            text: "fake",
            textAsHtml: "fake",
          },
          summary: "Huh?",
          attachments: [],
        });

        expect(readAsStreamFake.callCount).toEqual(1);
        expect(readAsStreamFake.firstCall.args).toEqual(["source"]);

        expect(writeFake.callCount).toEqual(5);
        expect(scope.isDone()).toEqual(true);
        const pixelWriteParams = writeFake.getCall(0).args[0];
        expect(pixelWriteParams).toMatchObject({
          metadata: {
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        });
        expect(pixelWriteParams.key).toEqual("destination/ei_055vs9pl");
        expect(pixelWriteParams.body).toBeInstanceOf(Readable);
        const bufPixelReceived = await readStream(pixelWriteParams.body);
        expect(BUF_TRANSPARENT_GIF.compare(bufPixelReceived)).toEqual(0);

        expect(writeFake.getCall(1).args).toEqual([{
          key: "destination/message.txt",
          body: Buffer.from("Huh?", "utf8"),
          metadata: {
            contentType: "text/plain; charset=utf-8",
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        }]);
        expect(writeFake.getCall(2).args).toEqual([{
          key: "destination/message-text.html",
          body: Buffer.from("<p>Huh?</p>", "utf8"),
          metadata: {
            contentType: "text/html; charset=utf-8",
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        }]);
        expect(writeFake.getCall(3).args).toEqual([{
          key: "destination/message.html",
          body: Buffer.from("<html><head></head><body>Huh?\n\n\n<img src=\"https://example.com/destination/ei_055vs9pl" +
            "\"></body></html>", "utf8"),
          metadata: {
            contentType: "text/html; charset=utf-8",
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        }]);
      });
    });

    describe("complex", () => {
      it("should sanitize content and import mail", async () => {
        const bitlyInterceptor = nock("https://bit.ly");

        const githubScope = nock("https://github.com")
          .get("/mooyoul/poo.email")
          .twice()
          .reply(200, "OK");

        const shortenLinkScope = bitlyInterceptor.get("/2CtAY9E")
          .reply(302, "Moved", {
            Location: "https://github.com/mooyoul/poo.email",
          });

        const bufImage = await fs.readFile("fixtures/yeri.jpg");

        const imageScope = nock("https://media.vingle.net")
          .get("/images/ca_xl/mop2hme5is.jpg")
          .reply(200, bufImage, {
            "Content-Type": "image/jpeg",
          });

        const shortenImageScope = bitlyInterceptor.get("/3do8jkd")
          .reply(302, "Moved", {
            Location: "https://example.com/image.gif",
          });
        const secondImageScope = nock("https://example.com")
          .get("/image.gif")
          .reply(200, BUF_TRANSPARENT_GIF, {
            "Content-Type": "image/gif",
          });

        const readAsStreamFake = sandbox.spy(() => createReadStream("fixtures/external-links-and-images.bin"));
        const writeFake = sinon.fake.resolves({
          bucket: "fake",
          key: "fake",
        });
        const importer = new MailImporter({
          storage: { write: writeFake, readAsStream: readAsStreamFake } as any,
          expiresInDays: 14,
          baseUrl: "https://example.com/",
        });

        const randomFake = sandbox.stub(Math, "random");

        randomFake.onFirstCall().returns(0.003984116173610941);
        randomFake.onSecondCall().returns(0.7572963528926018);

        const mail = await importer.import("source", "destination");

        randomFake.restore();

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
          date: 1595100029000,
          subject: "Test external links and images",
          content: {
            html: "fake",
            text: "fake",
            textAsHtml: "fake",
          },
          summary: [
            "External Link",
            "- Github (Direct Link): https://github.com/mooyoul/poo.email",
            "- Github (Shorten Link): https://bit.ly/2CtAY9E",
            "",
            "External Image",
            "",
          ].join("\n"),
          attachments: [],
        });

        expect(readAsStreamFake.callCount).toEqual(1);
        expect(readAsStreamFake.firstCall.args).toEqual(["source"]);

        expect(githubScope.isDone()).toEqual(true);
        expect(shortenLinkScope.isDone()).toEqual(true);

        expect(imageScope.isDone()).toEqual(true);
        const imageWriteParams = writeFake.getCall(0).args[0];
        expect(imageWriteParams).toMatchObject({
          metadata: {
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        });
        expect(imageWriteParams.key).toEqual("destination/ei_055vs9pl");
        expect(imageWriteParams.body).toBeInstanceOf(Readable);
        const bufImageReceived = await readStream(imageWriteParams.body);
        expect(bufImage.compare(bufImageReceived)).toEqual(0);

        expect(shortenImageScope.isDone()).toEqual(true);
        expect(secondImageScope.isDone()).toEqual(true);

        const secondImageWriteParams = writeFake.getCall(1).args[0];
        expect(secondImageWriteParams).toMatchObject({
          metadata: {
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        });
        expect(secondImageWriteParams.key).toEqual("destination/ei_r9gf2k3d");
        expect(secondImageWriteParams.body).toBeInstanceOf(Readable);
        const bufSecondImageReceived = await readStream(secondImageWriteParams.body);
        expect(BUF_TRANSPARENT_GIF.compare(bufSecondImageReceived)).toEqual(0);

        expect(writeFake.callCount).toEqual(6);
        expect(writeFake.getCall(2).args).toEqual([{
          key: "destination/message.txt",
          // tslint:disable-next-line
          body: Buffer.from([
            "External Link",
            "- Github (Direct Link): https://github.com/mooyoul/poo.email",
            "- Github (Shorten Link): https://bit.ly/2CtAY9E",
            "",
            "External Image",
            "",
          ].join("\n"), "utf8"),
          metadata: {
            contentType: "text/plain; charset=utf-8",
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        }]);
        expect(writeFake.getCall(3).args).toEqual([{
          key: "destination/message-text.html",
          // tslint:disable-next-line
          body: Buffer.from("<p>External Link<br/>- Github (Direct Link): <a href=\"https://github.com/mooyoul/poo.email\">https://github.com/mooyoul/poo.email</a><br/>- Github (Shorten Link): <a href=\"https://bit.ly/2CtAY9E\">https://bit.ly/2CtAY9E</a></p><p>External Image</p>", "utf8"),
          metadata: {
            contentType: "text/html; charset=utf-8",
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        }]);
        expect(writeFake.getCall(4).args).toEqual([{
          key: "destination/message.html",
          body: (await fs.readFile("fixtures/complex.html")).slice(-1), // strip newline at the end
          metadata: {
            contentType: "text/html; charset=utf-8",
            acl: "public-read",
            cacheControl: "public, max-age=1209600",
          },
        }]);
      });
    });
  });
});
