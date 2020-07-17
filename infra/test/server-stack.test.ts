import { expect, haveResourceLike } from "@aws-cdk/assert";

import * as cdk from "@aws-cdk/core";
import { ServerStack } from "../lib/server-stack";

describe(ServerStack.name, () => {
  let app: cdk.App;
  let stack: ServerStack;
  beforeEach(() => {
    app = new cdk.App();
    stack = new ServerStack(app, "MyTestStack", {
      stage: "test",
      domainName: "lvh.me",
      zoneName: "lvh.me",
      receiptRuleSet: "fakeRuleSet",
      env: {
        account: "FAKE",
        region: "us-east-1",
      },
    });
  });

  it("should create asset service", () => {
    expect(stack).to(haveResourceLike("AWS::S3::Bucket", {
      BucketName: "poo-email-test-assets",
      CorsConfiguration: {
        CorsRules: [{
          AllowedOrigins: [
            "http://www.lvh.me:8080",
            "https://lvh.me",
          ],
          AllowedMethods: ["GET", "HEAD"],
        }],
      },
    }));

    expect(stack).to(haveResourceLike("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Aliases: ["a.lvh.me"],
        DefaultCacheBehavior: {
          TargetOriginId: "origin1",
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          ForwardedValues: {
            Cookies: {
              Forward: "none",
            },
            Headers: ["Origin"],
            QueryString: false,
          },
          ViewerProtocolPolicy: "redirect-to-https",
          DefaultTTL: 3153600000,
          MinTTL: 3153600000,
          MaxTTL: 3153600000,
        },
        Origins: [{
          S3OriginConfig: {},
        }],
      },
    }));

    expect(stack).to(haveResourceLike("AWS::Route53::RecordSet", {
      Type: "A",
      Name: "a.lvh.me.",
    }));

    expect(stack).to(haveResourceLike("AWS::Route53::RecordSet", {
      Type: "AAAA",
      Name: "a.lvh.me.",
    }));
  });

  it("should create event gateway service", () => {
    expect(stack).to(haveResourceLike("AWS::DynamoDB::Table", {
      TableName: "poo-email-test-subscriptions",
      AttributeDefinitions: [{
        AttributeName: "pk",
        AttributeType: "S",
      }, {
        AttributeName: "sk",
        AttributeType: "S",
      }],
      KeySchema: [{
        KeyType: "HASH",
        AttributeName: "pk",
      }, {
        KeyType: "RANGE",
        AttributeName: "sk",
      }],
      GlobalSecondaryIndexes: [{
        IndexName: "key-swapped-index",
        KeySchema: [{
          KeyType: "HASH",
          AttributeName: "sk",
        }, {
          KeyType: "RANGE",
          AttributeName: "pk",
        }],
        Projection: {
          ProjectionType: "ALL",
        },
      }],
      BillingMode: "PAY_PER_REQUEST",
      TimeToLiveSpecification: {
        AttributeName: "ea",
        Enabled: true,
      },
    }));

    expect(stack).to(haveResourceLike("AWS::Lambda::Function", {
      Handler: "handlers/event-gateway.handler",
      Runtime: "nodejs12.x",
      MemorySize: 256,
      Timeout: 30,
      Environment: {
        Variables: {
          SUBSCRIPTION_TABLE_NAME: "poo-email-test-subscriptions",
          SUBSCRIPTION_INDEX_NAME: "key-swapped-index",
        },
      },
    }));

    expect(stack).to(haveResourceLike("AWS::ApiGatewayV2::Api", {
      Name: "poo-email-test-events",
      ProtocolType: "WEBSOCKET",
      RouteSelectionExpression: "$request.body.type",
    }));

    expect(stack).to(haveResourceLike("AWS::ApiGatewayV2::Integration", {
      IntegrationType: "AWS_PROXY",
    }));

    expect(stack).to(haveResourceLike("AWS::ApiGatewayV2::Route", {
      RouteKey: "$connect",
      OperationName: "connect",
    }));
    expect(stack).to(haveResourceLike("AWS::ApiGatewayV2::Route", {
      RouteKey: "$disconnect",
      OperationName: "disconnect",
    }));
    expect(stack).to(haveResourceLike("AWS::ApiGatewayV2::Route", {
      RouteKey: "$default",
      OperationName: "default",
    }));

    expect(stack).to(haveResourceLike("AWS::ApiGatewayV2::Deployment"));

    expect(stack).to(haveResourceLike("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Aliases: ["events.lvh.me"],
        DefaultCacheBehavior: {
          TargetOriginId: "origin1",
          AllowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
          ForwardedValues: {
            Cookies: {
              Forward: "none",
            },
            Headers: [
              "Origin",
              "Sec-WebSocket-Key",
              "Sec-WebSocket-Extensions",
              "Sec-WebSocket-Accept",
              "Sec-WebSocket-Protocol",
              "Sec-WebSocket-Version",
            ],
            QueryString: true,
          },
          ViewerProtocolPolicy: "redirect-to-https",
          DefaultTTL: 0,
          MinTTL: 0,
          MaxTTL: 0,
        },
      },
    }));

    expect(stack).to(haveResourceLike("AWS::Route53::RecordSet", {
      Type: "A",
      Name: "events.lvh.me.",
    }));

    expect(stack).to(haveResourceLike("AWS::Route53::RecordSet", {
      Type: "AAAA",
      Name: "events.lvh.me.",
    }));
  });

  it("should create email processing service", () => {
    expect(stack).to(haveResourceLike("AWS::DynamoDB::Table", {
      TableName: "poo-email-test-emails",
      AttributeDefinitions: [{
        AttributeName: "pk",
        AttributeType: "S",
      }, {
        AttributeName: "sk",
        AttributeType: "S",
      }],
      KeySchema: [{
        KeyType: "HASH",
        AttributeName: "pk",
      }, {
        KeyType: "RANGE",
        AttributeName: "sk",
      }],
      BillingMode: "PAY_PER_REQUEST",
      TimeToLiveSpecification: {
        AttributeName: "ea",
        Enabled: true,
      },
    }));

    expect(stack).to(haveResourceLike("AWS::Lambda::Function", {
      Handler: "handlers/inbound-email.handler",
      Runtime: "nodejs12.x",
      MemorySize: 256,
      Timeout: 30,
      Environment: {
        Variables: {
          INBOUND_EMAIL_PREFIX: "emails/raw/",
          ARCHIVED_EMAIL_PREFIX: "emails/archived/",
          CDN_BASE_URL: "https://a.lvh.me",
          EMAIL_BUCKET_NAME: {},
          EMAIL_TABLE_NAME: {},
          EVENT_GATEWAY_BASE_URL: {},
          SUBSCRIPTION_TABLE_NAME: {},
          SUBSCRIPTION_INDEX_NAME: "key-swapped-index",
        },
      },
    }));
  });

  it("should create api service", () => {
    expect(stack).to(haveResourceLike("AWS::Lambda::Function", {
      Handler: "handlers/api.handler",
      Runtime: "nodejs12.x",
      MemorySize: 256,
      Timeout: 15,
      Environment: {
        Variables: {
          EMAIL_TABLE_NAME: {},
          CDN_BASE_URL: "https://a.lvh.me",
          EVENT_GATEWAY_BASE_URL: {},
          SUBSCRIPTION_TABLE_NAME: {},
          SUBSCRIPTION_INDEX_NAME: "key-swapped-index",
        },
      },
    }));

    expect(stack).to(haveResourceLike("AWS::ApiGateway::RestApi", {
      Name: "poo-email-test-api",
    }));

    expect(stack).to(haveResourceLike("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Aliases: ["api.lvh.me"],
        DefaultCacheBehavior: {
          TargetOriginId: "origin1",
          AllowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
          ForwardedValues: {
            Cookies: {
              Forward: "none",
            },
            Headers: [
              "Origin",
            ],
            QueryString: true,
          },
          ViewerProtocolPolicy: "redirect-to-https",
          DefaultTTL: 0,
          MinTTL: 0,
          MaxTTL: 0,
        },
      },
    }));

    expect(stack).to(haveResourceLike("AWS::Route53::RecordSet", {
      Type: "A",
      Name: "api.lvh.me.",
    }));

    expect(stack).to(haveResourceLike("AWS::Route53::RecordSet", {
      Type: "AAAA",
      Name: "api.lvh.me.",
    }));
  });
});
