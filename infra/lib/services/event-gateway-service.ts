import * as cdk from "@aws-cdk/core";
import * as path from "path";

import * as apigwV2 from "@aws-cdk/aws-apigatewayv2";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";

export interface EventGatewaySubscription {
  readonly table: ddb.ITable;
  readonly index: {
    readonly indexName: string;
    readonly indexArn: string;
  };
}

export interface EventGatewayServiceProps {
  readonly stage: string;
  readonly domainName: string;
  readonly hostedZone: route53.IHostedZone;
}

export class EventGatewayService extends cdk.Construct {
  public readonly handler: lambda.IFunction;
  public readonly subscription: EventGatewaySubscription;
  public readonly api: apigwV2.CfnApi;
  public readonly apiStageArn: string;
  public readonly domainName: string;
  public readonly baseUrl: string;
  public readonly distribution: cf.CloudFrontWebDistribution;

  public constructor(scope: cdk.Construct, id: string, props: EventGatewayServiceProps) {
    super(scope, id);

    const { stage, domainName, hostedZone } = props;

    const tableName = `poo-email-${stage}-subscriptions`;
    const indexName = "key-swapped-index";

    // Create a DynamoDB Table to manage event subscriptions
    const table = new ddb.Table(this, "SubscriptionTable", {
      tableName,
      partitionKey: {
        name: "pk",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ea",
    });

    table.addGlobalSecondaryIndex({
      indexName,
      partitionKey: {
        name: "sk",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "pk",
        type: ddb.AttributeType.STRING,
      },
      projectionType: ddb.ProjectionType.ALL,
    });

    const indexArn = `${table.tableArn}/index/${indexName}`;

    // Create a Lambda Function for handling websocket events
    this.handler = new lambda.Function(this, "Handler", {
      code: lambda.Code.fromAsset(path.resolve(__dirname, "..", "..", "..", "server", "dist.zip")),
      handler: "handlers/event-gateway.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        SUBSCRIPTION_TABLE_NAME: tableName,
        SUBSCRIPTION_INDEX_NAME: indexName,
      },
    });

    // Give DynamoDB Table access to the gateway function
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
        table.tableArn,
        indexArn,
      ],
    }));

    // Creates a new API Gateway V2 WebSocket APi
    this.api = new apigwV2.CfnApi(this, "API", {
      name: `poo-email-${stage}-events`,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.type",
    });

    // Give Lambda access to the api gateway
    const apiRole = new iam.Role(this, "APIRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      inlinePolicies: {
        "allow-invoke-lambda": new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [this.handler.functionArn],
            actions: ["lambda:InvokeFunction"],
          })],
        }),
      },
    });

    // Create API Gateway Integration for Lambda
    const apiIntegration = new apigwV2.CfnIntegration(this, "APIIntegration", {
      apiId: this.api.ref,
      integrationType: apigwV2.HttpIntegrationType.LAMBDA_PROXY,
      integrationUri: `arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}:lambda:path/2015-03-31/functions/${this.handler.functionArn}/invocations`,
      credentialsArn: apiRole.roleArn,
    });

    const apiIntegrationTarget = `integrations/${apiIntegration.ref}`;

    // Create WebSocket Routes
    const connectRoute = new apigwV2.CfnRoute(this, "APIConnectRoute", {
      apiId: this.api.ref,
      routeKey: "$connect",
      authorizationType: "NONE",
      operationName: "connect",
      target: apiIntegrationTarget,
    });
    const disconnectRoute = new apigwV2.CfnRoute(this, "APIDisconnectRoute", {
      apiId: this.api.ref,
      routeKey: "$disconnect",
      authorizationType: "NONE",
      operationName: "disconnect",
      target: apiIntegrationTarget,
    });
    const defaultRoute = new apigwV2.CfnRoute(this, "APIDefaultRoute", {
      apiId: this.api.ref,
      routeKey: "$default",
      authorizationType: "NONE",
      operationName: "default",
      target: apiIntegrationTarget,
    });

    // Create Deployment
    const deployment = new apigwV2.CfnDeployment(this, "APIDeployment", {
      apiId: this.api.ref,
    });

    // Create Stage
    const apiStage = new apigwV2.CfnStage(this, "APIStage", {
      apiId: this.api.ref,
      deploymentId: deployment.ref,
      stageName: stage,
    });

    // Give API Gateway management access to the processor function
    const stageArn = `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${this.api.ref}/${stage}`;
    this.handler.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "execute-api:ManageConnections",
      ],
      resources: [
        stageArn,
        `${stageArn}/*`,
      ],
    }));

    // Register routes to API Deployment dependency
    const routes = new cdk.ConcreteDependable();
    routes.add(connectRoute);
    routes.add(disconnectRoute);
    routes.add(defaultRoute);

    // Add the dependency
    deployment.node.addDependency(routes);

    const apiDomainName = `${this.api.ref}.execute-api.${cdk.Aws.REGION}.amazonaws.com`;

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
          domainName: apiDomainName,
          originProtocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
          originKeepaliveTimeout: cdk.Duration.seconds(60),
          originReadTimeout: cdk.Duration.seconds(30),
        },
        // Currently, setting origin path gives 403 Forbidden Error.
        // I tried to mitigate this issue, enabled API G/W logs
        // and couldn't find any helpful resources to resolve the issue.
        //
        // So that's why i disabled originPath configuration,
        // need to re-enable originPath config to strip stage name from endpoint url.
        //
        // @see https://github.com/aws-samples/simple-websockets-chat-app/issues/5
        // @todo re-enable `originPath` configuration
        // originPath: `/${stage}`,
        behaviors: [{
          isDefaultBehavior: true,
          allowedMethods: cf.CloudFrontAllowedMethods.ALL,
          cachedMethods: cf.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
          forwardedValues: {
            headers: [
              "Origin",
              "Sec-WebSocket-Key",
              "Sec-WebSocket-Extensions",
              "Sec-WebSocket-Accept",
              "Sec-WebSocket-Protocol",
              "Sec-WebSocket-Version",
            ],
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

    // Expose API Stage ARN
    this.apiStageArn = stageArn;

    // Expose Subscription Table
    this.subscription = {
      table,
      index: {
        indexName,
        indexArn,
      },
    };

    // Expose Endpoint
    this.domainName = domainName;
    this.baseUrl = `https://${apiDomainName}/${stage}`;
  }
}
