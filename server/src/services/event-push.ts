import * as APIGatewayManagementAPI from "aws-sdk/clients/apigatewaymanagementapi";
import * as BbPromise from "bluebird";

import { EventSubscriptionService } from "./event-subscription";

export class EventPushService {
  private static readonly MAX_CONCURRENCY = 32;
  private static readonly SUBSCRIPTION_TTL = 3600 * 2 * 1000; // 2 hours

  protected readonly api: APIGatewayManagementAPI;
  protected readonly subscriptionService: EventSubscriptionService;

  public constructor(endpointUrl: string, subscriptionService: EventSubscriptionService) {
    this.api = new APIGatewayManagementAPI({
      endpoint: endpointUrl,
    });
    this.subscriptionService = subscriptionService;
  }

  public async broadcast(topic: string, data: any): Promise<void> {
    const serialized = JSON.stringify(data);
    const subscriptions = await this.subscriptionService.findByTopic(topic);

    const responses = await BbPromise.map(subscriptions, async (subscription) => {
      try {
        await this.api.postToConnection({
          ConnectionId: subscription.connectionId,
          Data: serialized,
        }).promise();

        return {
          connectionId: subscription.connectionId,
          success: true,
        };
      } catch (e) {
        // tslint:disable-next-line
        console.error(e.stack);

        return {
          connectionId: subscription.connectionId,
          success: false,
        };
      }
    }, { concurrency: EventPushService.MAX_CONCURRENCY });

    const failedConnectionIds = responses
      .filter((res) => !res.success)
      .map((res) => res.connectionId);

    if (failedConnectionIds.length > 0) {
      await this.subscriptionService.unsubscribeBatch(topic, failedConnectionIds);
    }
  }

  public async send(connectionId: string, data: any): Promise<void> {
    const serialized = JSON.stringify(data);

    await this.api.postToConnection({
      ConnectionId: connectionId,
      Data: serialized,
    }).promise();
  }
}
