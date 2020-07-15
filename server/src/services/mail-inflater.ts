import * as BbPromise from "bluebird";
import { AttachmentCommon, AttachmentStream, MessageText } from "mailparser";
import * as path from "path";
import * as stream from "stream";

import { MeasureStream } from "./measure-stream";
import { Metadata, Storage } from "./storage";

export type InflatedMail = {
  text: string;
  textAsHtml: string;
  html: string;
  attachments: AttachmentObject[];
};

export interface AttachmentObject extends AttachmentCommon {
  content: string;
}

export class MailInflater extends stream.Transform {
  private readonly storage: Storage;
  private readonly prefix: string;
  private readonly metadataFactory: () => Partial<Metadata>;

  private text: string = "";
  private textAsHtml: string = "";
  private html: string = "";
  private attachments: AttachmentObject[] = [];

  public constructor(options: {
    storage: Storage;
    prefix: string;
    metadataFactory: () => Partial<Metadata>;
  }) {
    super({ objectMode: true });

    this.storage = options.storage;
    this.prefix = options.prefix;
    this.metadataFactory = options.metadataFactory;
  }

  public _transform(data: AttachmentStream | MessageText, encoding: unknown, callback: stream.TransformCallback) {
    if (data.type === "text") {
      return BbPromise.resolve(this.consumeText(data)).asCallback(callback);
    }

    if (data.type === "attachment") {
      return BbPromise.resolve(this.consumeAttachment(data)).asCallback(callback);
    }

    // Ignore unknown attachment types
    callback(null);
  }

  public _flush(callback: stream.TransformCallback) {
    callback(null, {
      text: this.text,
      textAsHtml: this.textAsHtml,
      html: this.html,
      attachments: this.attachments,
    });
  }

  private async consumeText(data: MessageText) {
    if (typeof data.text === "string") {
      this.text = data.text;
    }

    if (typeof data.textAsHtml === "string") {
      this.textAsHtml = data.textAsHtml;
    }

    if (typeof data.html === "string") {
      this.html = data.html;
    }
  }

  private async consumeAttachment(data: AttachmentStream) {
    const id = data.cid || Math.random().toString(36).slice(2, 10);

    const measureStream = new MeasureStream();

    try {
      const res = await this.storage.write({
        key: path.join(this.prefix, id),
        body: (data.content as stream.Readable).pipe(measureStream),
        metadata: {
          contentType: data.contentType,
          ...this.metadataFactory(),
        },
      });

      (data as any as AttachmentObject).content = res.key;
      data.size = measureStream.size;
      this.attachments.push(data as any as AttachmentObject);
    } finally {
      data.release();
    }
  }
}
