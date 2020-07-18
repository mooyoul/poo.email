import * as BbPromise from "bluebird";
import * as cheerio from "cheerio";
import * as ContentType from "content-type";
import got, { Response as GotResponse } from "got";
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

    const sanitized = await this.sanitize(inflated.html, destination);

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

  private async sanitize(input: string, destination: string) {
    const sanitized = sanitizeHtml(input, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "width", "height"],
      },
    });

    const $ = cheerio.load(sanitized);
    const $links = $("a[href]");
    const $images = $("img[src]")
      .filter((_, el) => !$(el).attr("src")?.startsWith(this.baseUrl));

    const [ links, images ] = await Promise.all([
      (async () => {
        const found = $links
          .map((index, el) => $(el).attr("href")).get()
          .filter((src) => !!src);

        const uniqueUrls = Array.from(new Set(found));

        const fetched = await BbPromise.map(
          uniqueUrls,
          async (url): Promise<[string, string]> => {
            try {
              return await new Promise<[string, string]>((resolve, reject) => {
                const req = got.stream(url, { timeout: 10000 })
                  .on("error", onError)
                  .on("response", onResponse);

                function onResponse(res: GotResponse) {
                  req.removeListener("error", onError);
                  req.removeListener("response", onResponse);

                  const resolvedUrl = res.url;

                  // abort response to stop downloading rest response body
                  req.destroy();
                  res.destroy();

                  resolve([ url, resolvedUrl ]);
                }

                function onError(e: Error) {
                  req.removeListener("error", onError);
                  req.removeListener("response", onResponse);

                  req.destroy();

                  reject(e);
                }
              });
            } catch (e) {
              console.error(e.stack); // tslint:disable-line

              return [url, url];
            }
          },
          { concurrency: 16 },
        );

        return new Map<string, string>(fetched);
      })(),
      (async () => {
        const found = $images
          .map((index, el) => $(el).attr("src")).get()
          .filter((src) => !!src);

        const uniqueUrls = Array.from(new Set(found));

        const proxied = await BbPromise.map(
          uniqueUrls,
          async (url): Promise<[string, string]> => {
            const id = `ei_${Math.random().toString(36).slice(2, 10)}`;
            const key = path.join(destination, id);

            try {
              await this.storage.write({
                key,
                body: got.stream(url, {
                  timeout: 10000,
                }),
                metadata: {
                  acl: "public-read",
                  cacheControl: "public, max-age=1209600",
                },
              });

              return [url, `${this.baseUrl}/${key}`];
            } catch (e) {
              console.error(e.stack); // tslint:disable-line

              return [url, url];
            }
          },
          { concurrency: 16 },
        );

        return new Map<string, string>(proxied);
      })(),
    ]);

    $links.each((_, el) => {
      const $el = $(el);
      const original = $el.attr("href");
      const resolved = original && links.get(original);
      if (resolved) {
        $el.attr("href", resolved);
      }

      const $addonEl = $(" <a>[Original Link]</a>");
      const $originalLinkEl = $addonEl.filter("a");
      $originalLinkEl.attr("href", original!);

      for (const $selector of [$el, $originalLinkEl]) {
        $selector
          .attr("rel", "noreferrer")
          .attr("target", "_blank");
      }

      if (original !== resolved) {
        $el.after($addonEl);
      }
    });
    $images.each((_, el) => {
      const $el = $(el);
      const original = $el.attr("src");
      const resolved = original && images.get(original);
      if (resolved) {
        $el.attr("src", resolved);
      }
    });

    return $.root().html() ?? "";
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
