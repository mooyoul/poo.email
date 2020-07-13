import { APIGatewayWebSocketEvent, APIGatewayWebSocketResult } from "../types/apigateway-websocket";

import { EventPushService } from "../services/event-push";
import { EventSubscriptionService } from "../services/event-subscription";

const subscriptionService = new EventSubscriptionService();

export async function handler(event: APIGatewayWebSocketEvent): Promise<APIGatewayWebSocketResult> {
  console.log("event: %j", event); // tslint:disable-line

  const { connectionId, eventType } = event.requestContext;
  const body = (() => {
    if (!event.body) {
      return null;
    }

    try {
      return JSON.parse(event.body);
    } catch (e) {
      return null;
    }
  })();

  if (body?.type === "ping") {
    const { domainName, stage } = event.requestContext;
    const endpoint = `https://${domainName}/${stage}`;
    const pushService = new EventPushService(endpoint, subscriptionService);
    await pushService.send(connectionId, { type: "pong" });
  }

  if (body?.type === "subscribe" && body?.data?.topic) {
    const { topic } = body.data;
    await subscriptionService.subscribe(topic, connectionId);
  }

  if (body?.type === "unsubscribe" && body?.data?.topic) {
    const { topic } = body.data;
    await subscriptionService.unsubscribe(topic, connectionId);
  }

  if (eventType === "DISCONNECT") {
    await subscriptionService.clear(connectionId);
  }

  return {
    statusCode: 200,
    body: "",
  };
}
