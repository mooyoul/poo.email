import * as cdk from "@aws-cdk/core";
import * as path from "path";

import * as apigw from "@aws-cdk/aws-apigateway";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";

import { EventGatewaySubscription } from "./event-gateway-service";

export interface APIServiceProps {
  readonly stage: string;
  readonly domainName: string;
  readonly hostedZone: route53.IHostedZone;
  readonly emailTable: ddb.ITable;
  readonly event: {
    readonly baseUrl: string;
    readonly arn: string;
    readonly subscription: EventGatewaySubscription;
  };
  readonly cdn: {
    readonly baseUrl: string;
  };
}

export class APIService extends cdk.Construct {
  public readonly handler: lambda.IFunction;
  public readonly api: apigw.IRestApi;
  public readonly distribution: cf.CloudFrontWebDistribution;

  public constructor(scope: cdk.Construct, id: string, props: APIServiceProps) {
    super(scope, id);

    const { stage, domainName, hostedZone, emailTable, event, cdn } = props;

    // Create a Lambda Function for handling API requests
    this.handler = new lambda.Function(this, "Handler", {
      code: lambda.Code.fromAsset(path.resolve(__dirname, "..", "..", "..", "server", "dist.zip")),
      handler: "handlers/api.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: {
        EMAIL_TABLE_NAME: emailTable.tableName,
        CDN_BASE_URL: cdn.baseUrl,
        EVENT_GATEWAY_BASE_URL: event.baseUrl,
        SUBSCRIPTION_TABLE_NAME: props.event.subscription.table.tableName,
        SUBSCRIPTION_INDEX_NAME: props.event.subscription.index.indexName,
      },
    });

    // Give DynamoDB Table access to the api function
    this.handler.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:ConditionCheckItem",
        "dynamodb:DeleteItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
      ],
      resources: [
        emailTable.tableArn,
        event.subscription.table.tableArn,
      ],
    }));

    // Give API Gateway management access to the processor function
    this.handler.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "execute-api:ManageConnections",
      ],
      resources: [
        event.arn,
        `${event.arn}/*`,
      ],
    }));

    // Creates a new API Gateway API
    this.api = new apigw.LambdaRestApi(this, "API", {
      restApiName: `poo-email-${stage}-api`,
      handler: this.handler,
      proxy: true,
      endpointConfiguration: {
        types: [apigw.EndpointType.REGIONAL],
      },
    });

    // Create ACM Certificate
    const certificate = new acm.DnsValidatedCertificate(this, "Certificate", {
      domainName,
      hostedZone,
    });

    // Create CF Distribution
    this.distribution = new cf.CloudFrontWebDistribution(this, "Distribution", {
      viewerCertificate: cf.ViewerCertificate.fromAcmCertificate(certificate, {
        sslMethod: cf.SSLMethod.SNI,
        securityPolicy: cf.SecurityPolicyProtocol.TLS_V1_2016,
        aliases: [domainName],
      }),
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      errorConfigurations: [400, 403, 404, 405, 414, 416, 500, 501, 502, 503, 504].map((status) => ({
        errorCode: status,
        errorCachingMinTtl: 0,
      })),
      originConfigs: [{
        customOriginSource: {
          domainName: `${this.api.restApiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com`,
          originProtocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
          originKeepaliveTimeout: cdk.Duration.seconds(60),
          originReadTimeout: cdk.Duration.seconds(30),
        },
        originPath: `/${this.api.deploymentStage.stageName}`,
        behaviors: [{
          isDefaultBehavior: true,
          allowedMethods: cf.CloudFrontAllowedMethods.ALL,
          cachedMethods: cf.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
          forwardedValues: {
            headers: ["Origin"],
            queryString: true,
            cookies: {
              forward: "none",
            },
          },
          compress: true,
          defaultTtl: cdk.Duration.seconds(0), // disable cache
          minTtl: cdk.Duration.seconds(0), // disable cache
          maxTtl: cdk.Duration.seconds(0), // disable cache
        }],
      }],
      enableIpV6: true,
      priceClass: cf.PriceClass.PRICE_CLASS_ALL,
    });

    const cloudfrontTarget = new route53Targets.CloudFrontTarget(this.distribution);

    const recordName = (() => {
      const index = domainName.indexOf(hostedZone.zoneName);

      return index > 0
        ? domainName.slice(0,  index - 1)
        : "";
    })();

    const ipv4Record = new route53.ARecord(this, "IPv4Record", {
      recordName,
      zone: hostedZone,
      target: {
        aliasTarget: cloudfrontTarget,
      },
    });
    const ipv6Record = new route53.AaaaRecord(this, "IPv6Record", {
      recordName,
      zone: hostedZone,
      target: {
        aliasTarget: cloudfrontTarget,
      },
    });
  }
}
