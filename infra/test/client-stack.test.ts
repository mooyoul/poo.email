import { expect, haveResourceLike } from "@aws-cdk/assert";

import * as cdk from "@aws-cdk/core";
import { ClientStack } from "../lib/client-stack";

describe(ClientStack.name, () => {
  let app: cdk.App;
  let stack: ClientStack;
  beforeEach(() => {
    app = new cdk.App();
    stack = new ClientStack(app, "MyTestStack", {
      stage: "test",
      domainName: "lvh.me",
      zoneName: "lvh.me",
      env: {
        account: "FAKE",
        region: "us-east-1",
      },
    });
  });

  it("should create s3 bucket", () => {
    expect(stack).to(haveResourceLike("AWS::S3::Bucket", {
      BucketName: "poo-email-test-client",
    }));
  });

  it("should create distribution", () => {
    expect(stack).to(haveResourceLike("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Aliases: ["lvh.me"],
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
      Name: "lvh.me.",
    }));

    expect(stack).to(haveResourceLike("AWS::Route53::RecordSet", {
      Type: "AAAA",
      Name: "lvh.me.",
    }));
  });
});
