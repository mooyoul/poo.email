import { expect, haveResourceLike } from "@aws-cdk/assert";

import * as cdk from "@aws-cdk/core";
import { CDNStack } from "../lib/cdn-stack";

describe(CDNStack.name, () => {
  let app: cdk.App;
  let stack: CDNStack;
  beforeEach(() => {
    app = new cdk.App();
    stack = new CDNStack(app, "MyTestStack", {
      domainName: "fake.lvh.me",
      zoneName: "lvh.me",
      api: {
        domain: "www.example.com",
        path: "/api",
      },
      env: {
        account: "FAKE",
        region: "us-east-1",
      },
    });
  });

  it("should create distribution", () => {
    expect(stack).to(haveResourceLike("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Aliases: ["fake.lvh.me"],
        DefaultCacheBehavior: {
          TargetOriginId: "origin1",
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
        },
        CacheBehaviors: [{
          TargetOriginId: "origin2",
          PathPattern: "/api/*",
          AllowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
          ForwardedValues: {
            Cookies: {
              Forward: "none",
            },
            Headers: ["Origin"],
            QueryString: true,
          },
          DefaultTTL: 0,
          MinTTL: 0,
          MaxTTL: 0,
        }],
        Origins: [{
          CustomOriginConfig: {
            OriginProtocolPolicy: "http-only",
          },
          DomainName: "www.lvh.me",
        }, {
          CustomOriginConfig: {
            HTTPSPort: 443,
            OriginKeepaliveTimeout: 30,
            OriginProtocolPolicy: "https-only",
            OriginSSLProtocols: [
              "TLSv1.2",
            ],
          },
          DomainName: "www.example.com",
          OriginPath: "/api",
        }],
      },
    }));

    expect(stack).to(haveResourceLike("AWS::Route53::RecordSet", {
      Type: "A",
      Name: "fake.lvh.me.",
    }));

    expect(stack).to(haveResourceLike("AWS::Route53::RecordSet", {
      Type: "AAAA",
      Name: "fake.lvh.me.",
    }));
  });
});
