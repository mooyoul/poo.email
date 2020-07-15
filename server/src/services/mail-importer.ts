import * as BbPromise from "bluebird";
import * as ContentType from "content-type";
import { AddressObject, Attachment, MailParser, ParsedMail } from "mailparser";
import * as moment from "moment";
import * as path from "path";
import * as sanitizeHtml from "sanitize-html";
import * as stream from "stream";
import * as stringz from "stringz";

import { Mail } from "../models/mail";
import { InflatedMail, MailInflater } from "./mail-inflater";
import { Storage } from "./storage";

type MailParserExtended = MailParser & {
  headers: ParsedMail["headers"];
  headerLines: ParsedMail["headerLines"];
  updateImageLinks(
    replacer: (attachment: Attachment, done: (error?: Error | null, url?: string) => void) => void,
    callback: (error?: Error, html?: string) => void,
  ): void;
};

export class MailImporter {
  protected readonly storage: Storage;
  protected readonly expiresInDays: number;
  protected readonly baseUrl: string;

  public constructor(options: {
    storage: Storage;
    expiresInDays: number;
    baseUrl: string;
  }) {
    this.storage = options.storage;
    this.expiresInDays = options.expiresInDays;
    // strip trailing slash
    this.baseUrl = options.baseUrl.replace(/\/?$/i, "");
  }

  public async import(source: string, destination: string): Promise<Mail> {
    const inflated = await this.inflate(source, destination);

    const sanitized = sanitizeHtml(inflated.html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "width", "height"],
      },
    });

    const [text, textAsHtml, html] = await BbPromise.map([{
      key: path.join(destination, "message.txt"),
      data: inflated.text,
      contentType: "text/plain; charset=utf-8",
    }, {
      key: path.join(destination, "message-text.html"),
      data: inflated.textAsHtml,
      contentType: "text/html; charset=utf-8",
    }, {
      key: path.join(destination, "message.html"),
      data: sanitized,
      contentType: "text/html; charset=utf-8",
    }, {
      key: path.join(destination, "raw.html"),
      data: inflated.html,
      contentType: "text/html; charset=utf-8",
    }], async ({ key, data, contentType }) => {
      const res = await this.storage.write({
        key,
        body: Buffer.from(data, "utf8"),
        metadata: {
          contentType,
          acl: "public-read",
          cacheControl: `public, max-age=${moment.duration(this.expiresInDays, "day").asSeconds()}`,
          expiresAt: moment(new Date()).add(this.expiresInDays, "day").toDate(),
        },
      });

      return {
        key: res.key,
        value: data,
      };
    });

    return {
      from: (inflated.headers.get("from") as AddressObject)?.value,
      to: (inflated.headers.get("to") as AddressObject)?.value,
      cc: (inflated.headers.get("cc") as AddressObject)?.value,
      bcc: (inflated.headers.get("bcc") as AddressObject)?.value,
      date: (inflated.headers.get("date") as Date | undefined)?.getTime(),
      subject: inflated.headers.get("subject") as string,
      summary: this.truncate(text.value, 200),
      content: {
        text: text.key,
        textAsHtml: textAsHtml.key,
        html: html.key,
      },
      attachments: inflated.attachments.map((attachment) => {
        const mime = (() => {
          try {
            const parsed = ContentType.parse(attachment.contentType);
            return parsed.type;
          } catch (e) {
            return undefined;
          }
        })();

        return {
          cid: attachment.cid,
          mime,
          key: attachment.content,
          name: attachment.filename,
          size: attachment.size,
          related: !!attachment.related,
        };
      }),
    };
  }

  private async inflate(source: string, destination: string) {
    const parser = new MailParser() as MailParserExtended;
    const inflater = new MailInflater({
      storage: this.storage,
      prefix: destination,
      metadataFactory: () => ({
        acl: "public-read",
        cacheControl: `public, max-age=${moment.duration(this.expiresInDays, "day").asSeconds()}`,
        expiresAt: moment(new Date()).add(this.expiresInDays, "day").toDate(),
      }),
    });

    // Inflate mail contents
    await BbPromise.fromCallback<void>((cb) =>
      stream.pipeline(
        this.storage.readAsStream(source),
        parser,
        inflater,
        cb,
      ),
    );

    const inflated = inflater.read() as InflatedMail;

    // Transform mail html
    const html = await BbPromise.fromCallback<string>((cb) =>
      parser.updateImageLinks(
        (attachment, done) => done(null, `${this.baseUrl}/${attachment.content}`),
        cb,
      ),
    );

    return {
      headers: parser.headers,
      text: inflated.text,
      textAsHtml: inflated.textAsHtml,
      html: html || inflated.html,
      attachments: inflated.attachments,
    };
  }

  private truncate(str: string, limit: number, suffix = "...") {
    const len = stringz.length(str);
    if (len <= limit) {
      return str;
    } else {
      return `${stringz.limit(str, limit - suffix.length)}${suffix}`;
    }
  }
}
