import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";


export interface APIGatewayWebSocketRequestContext {
  routeKey: string;
  messageId: string | null;
  eventType: "CONNECT" | "MESSAGE" | "DISCONNECT";
  extendedRequestId: string;
  requestTime: string;
  messageDirection: "IN";
  stage: string;
  connectedAt: number;
  requestTimeEpoch: number;
  identity: {
    sourceIp: string;
  };
  requestId: string;
  domainName: string;
  connectionId: string;
  apiId: string;
}


export interface APIGatewayWebSocketEvent extends Omit<APIGatewayProxyEventV2, "requestContext"> {
  requestContext: APIGatewayWebSocketRequestContext;
}

export type APIGatewayWebSocketResult = APIGatewayProxyResultV2;
