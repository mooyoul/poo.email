import {
  Decorator,
  Query,
  Table,
} from "dynamo-types";

@Decorator.Table({ name: process.env.SUBSCRIPTION_TABLE_NAME! })
export class Subscription extends Table {
  @Decorator.FullPrimaryKey("pk", "sk")
  public static readonly primaryKey: Query.FullPrimaryKey<Subscription, string, string>;

  @Decorator.FullGlobalSecondaryIndex("sk", "pk", { name: process.env.SUBSCRIPTION_INDEX_NAME! })
  public static readonly connectionIdTopicIndex: Query.FullPrimaryKey<Subscription, string, string>;

  @Decorator.Writer()
  public static readonly writer: Query.Writer<Subscription>;

  /**
   * Model initializers
   */
  public static create(params: {
    topic: string;
    connectionId: string;
    ttl: number;
  }) {
    const model = new this();

    model.topic = params.topic;
    model.connectionId = params.connectionId;

    model.createdAt = Date.now();
    model.expiresAt = Math.floor((model.createdAt + params.ttl) / 1000);

    return model;
  }

  @Decorator.Attribute({ name: "pk" })
  public topic: string;

  @Decorator.Attribute({ name: "sk" })
  public connectionId: string;

  @Decorator.Attribute({ name: "ca" })
  public createdAt: number;

  @Decorator.Attribute({ name: "ea", timeToLive: true })
  public expiresAt: number;
}
