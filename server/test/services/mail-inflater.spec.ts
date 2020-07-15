import * as sinon from "sinon";
import { sandbox } from "../helper";

import * as BbPromise from "bluebird";
import { createReadStream, promises as fs } from "fs";
import { MailParser } from "mailparser";
import { pipeline, Readable } from "stream";

import { InflatedMail, MailInflater } from "../../src/services/mail-inflater";

describe(MailInflater.name, () => {
  let writeFake: sinon.SinonSpy;

  it("should inflate mail contents", async () => {
    const attachments: Buffer[] = [];

    writeFake = sandbox.spy(async (params: any) => {
      const body = params.body;

      if (body instanceof Readable) {
        const buf = await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];

          body
            .on("error", onError)
            .on("end", onEnd)
            .on("data", onData);

          function onError(e: Error) {
            body
              .removeListener("error", onError)
              .removeListener("data", onData)
              .removeListener("end", onEnd);

            reject(e);
          }

          function onData(data: Buffer) {
            chunks.push(data);
          }

          function onEnd() {
            body
              .removeListener("error", onError)
              .removeListener("data", onData)
              .removeListener("end", onEnd);

            resolve(Buffer.concat(chunks));
          }
        });

        attachments.push(buf);
      } else if (Buffer.isBuffer(body)) {
        attachments.push(body);
      }

      return {
        bucket: "bucket",
        key: "key",
      };
    });

    const inflater = new MailInflater({
      storage: { write: writeFake } as any,
      prefix: "prefix",
      metadataFactory: () => ({
        cacheControl: "public, max-age=300",
      }),
    });

    const received: InflatedMail[] = [];
    inflater.on("data", (data) => {
      received.push(data);
    });

    await BbPromise.fromCallback((cb) =>
      pipeline(
        createReadStream("fixtures/message.bin"),
        new MailParser(),
        inflater,
        cb,
      ),
    );

    expect(received).toHaveLength(1);
    const [ inflated ] = received;

    expect(inflated.text)
      .toEqual(await fs.readFile("fixtures/message.txt", { encoding: "utf8" }));
    expect(inflated.textAsHtml)
      .toEqual(await fs.readFile("fixtures/message-text.html", { encoding: "utf8" }));
    expect(inflated.html)
      .toEqual(await fs.readFile("fixtures/message.html", { encoding: "utf8" }));
    expect(inflated.attachments).toHaveLength(6);

    expect(inflated.attachments[0]).toMatchObject({
      type: "attachment",
      cid: "ii_kccnvfqy0",
      contentDisposition: "inline",
      contentId: "<ii_kccnvfqy0>",
      contentType: "image/jpeg",
      filename: "69715723_2233560556935420_5687551205906278563_n.jpg",
      partId: "1.2",
      related: true,
      size: 300685,
    });
    expect(inflated.attachments[1]).toMatchObject({
      type: "attachment",
      cid: "f_kccnvwuf1",
      contentDisposition: "attachment",
      contentId: "<f_kccnvwuf1>",
      contentType: "image/jpeg",
      filename: "69306637_243002586662415_6391202955112072587_n.jpg",
      partId: "2",
      size: 216153,
    });
    expect(inflated.attachments[2]).toMatchObject({
      type: "attachment",
      cid: "f_kccnwsn22",
      contentDisposition: "attachment",
      contentId: "<f_kccnwsn22>",
      contentType: "image/jpeg",
      filename: "71092978_190149792003863_6802180046793636855_n.jpg",
      partId: "3",
      size: 199906,
    });
    expect(inflated.attachments[3]).toMatchObject({
      type: "attachment",
      cid: "f_kccnxbdw3",
      contentDisposition: "attachment",
      contentId: "<f_kccnxbdw3>",
      contentType: "video/mp4",
      filename: "68504685_2471590556235938_3321432038327900351_n.mp4",
      partId: "4",
      size: 98516,
    });
    expect(inflated.attachments[4]).toMatchObject({
      type: "attachment",
      cid: "f_kccny1314",
      contentDisposition: "attachment",
      contentId: "<f_kccny1314>",
      contentType: "application/octet-stream",
      filename: "공적마스크 데이터 개방 및 활용 안내.hwp",
      partId: "5",
      size: 114688,
    });
    expect(inflated.attachments[5]).toMatchObject({
      type: "attachment",
      cid: "f_kccnylqi5",
      contentDisposition: "attachment",
      contentId: "<f_kccnylqi5>",
      contentType: "application/pdf",
      filename: "REPEAT_1_Amazon_DynamoDB_deep_dive_Advanced_design_patterns_DAT403-R1.pdf",
      partId: "6",
      size: 5177826,
    });

    expect(writeFake.callCount).toEqual(6);
    expect(attachments[0].length).toEqual(300685);
    const [firstUploadArgs] = writeFake.firstCall.args;

    expect(firstUploadArgs).toMatchObject({
      key: "prefix/ii_kccnvfqy0",
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=300",
      },
    });
    expect(
      Buffer.compare(
        await fs.readFile("fixtures/yeri.jpg"),
        attachments[2],
      ),
    ).toEqual(0);
  });
});
