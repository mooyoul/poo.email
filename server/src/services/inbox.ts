import { InboxMail } from "../models/inbox-mail";
import { Mail } from "../models/mail";
import { ReservedUsernames } from "../values/reserved-names";

export class Inbox {
  public static of(address: string) {
    return new this(address);
  }

  public readonly address: string;
  public readonly reserved: boolean;

  public constructor(address: string) {
    this.address = address;
    this.reserved = Array.from(ReservedUsernames.values())
      .some((username) => address.includes(username));
  }

  public async add(mail: Mail, ttl?: number) {
    const record = InboxMail.create({
      recipient: this.address,
      mail,
      ttl,
    });

    await record.save();

    return record;
  }

  public async list(limit: number = 50, after?: string) {
    const res = await InboxMail.primaryKey.query({
      hash: this.address,
      range: after ? ["<", after] : undefined,
      rangeOrder: "DESC",
      limit: limit + 1,
    });

    const hasNext = res.records.length > limit;
    const records = res.records.slice(0, limit);

    return {
      data: records,
      paging: {
        after: hasNext
          ? records[records.length - 1].messageId
          : undefined,
      },
    };
  }

  public async batchDelete(messageIds: string[]) {
    await InboxMail.primaryKey.batchDelete(
      messageIds.map((messageId) => [this.address, messageId]),
    );
  }
}
