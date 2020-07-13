import { Subscription } from "../models/subscription";

export class EventSubscriptionService {
  private static readonly SUBSCRIPTION_TTL = 3600 * 2 * 1000; // 2 hours

  public async findByTopic(topic: string): Promise<Subscription[]> {
    const records: Subscription[] = [];
    let lastEvaluatedKey: any;

    do {
      const res = await Subscription.primaryKey.query({
        hash: topic,
        exclusiveStartKey: lastEvaluatedKey,
      });

      records.push(...res.records);
      lastEvaluatedKey = res.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    return records;
  }

  public async findByConnectionId(connectionId: string): Promise<Subscription[]> {
    const records: Subscription[] = [];
    let lastEvaluatedKey: any;

    do {
      const res = await Subscription.connectionIdTopicIndex.query({
        hash: connectionId,
        exclusiveStartKey: lastEvaluatedKey,
      });

      records.push(...res.records);
      lastEvaluatedKey = res.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    return records;
  }

  public async subscribe(topic: string, connectionId: string): Promise<Subscription> {
    const record = Subscription.create({
      topic,
      connectionId,
      ttl: EventSubscriptionService.SUBSCRIPTION_TTL,
    });

    await record.save();

    return record;
  }

  public async unsubscribe(topic: string, connectionId: string): Promise<void> {
    await Subscription.primaryKey.delete(topic, connectionId);
  }

  public async unsubscribeBatch(topic: string, connectionIds: string[]): Promise<void> {
    await Subscription.primaryKey.batchDelete(
      connectionIds.map((connectionId) => [topic, connectionId]),
    );
  }

  public async clear(connectionId: string): Promise<void> {
    const subscriptions = await this.findByConnectionId(connectionId);

    await Subscription.primaryKey.batchDelete(
      subscriptions.map((subscription) => [subscription.topic, subscription.connectionId]),
    );
  }
}
