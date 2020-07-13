import {
  Decorator,
  Query,
  Table,
} from "dynamo-types";

import { EpochIdentifier } from "./core";
import { Mail } from "./mail";

const identifier = new EpochIdentifier("M");

@Decorator.Table({ name: process.env.EMAIL_TABLE_NAME! })
export class InboxMail extends Table {
  @Decorator.FullPrimaryKey("pk", "sk")
  public static readonly primaryKey: Query.FullPrimaryKey<InboxMail, string, string>;

  @Decorator.Writer()
  public static readonly writer: Query.Writer<InboxMail>;

  /**
   * Model initializers
   */
  public static create(params: {
    recipient: string;
    mail: Mail;
    ttl?: number;
  }) {
    const model = new this();

    model.recipient = params.recipient;
    model.messageId = identifier.generate();

    model.mail = params.mail;
    if (params.ttl) {
      model.expiresAt = Math.floor((model.createdAt + params.ttl) / 1000);
    }

    return model;
  }

  @Decorator.Attribute({ name: "pk" })
  public recipient: string;

  @Decorator.Attribute({ name: "sk" })
  public messageId: string;

  @Decorator.Attribute({ name: "m" })
  public mail: Mail;

  public get createdAt(): number {
    return identifier.parse(this.messageId);
  }

  @Decorator.Attribute({ name: "ea", timeToLive: true })
  public expiresAt?: number;
}
