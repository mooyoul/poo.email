import * as cdk from "@aws-cdk/core";
import * as path from "path";

import * as ddb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import { EventGatewaySubscription } from "./event-gateway-service";

export interface EmailProcessingServiceProps {
  readonly stage: string;
  readonly event: {
    readonly baseUrl: string;
    readonly arn: string;
    readonly subscription: EventGatewaySubscription;
  };
  readonly ses: {
    readonly bucket: s3.IBucket;
    readonly prefix: string;
  };
  readonly cdn: {
    readonly baseUrl: string;
  };
}

export class EmailProcessingService extends cdk.Construct {
  public readonly handler: lambda.IFunction;
  public readonly table: ddb.ITable;

  public constructor(scope: cdk.Construct, id: string, props: EmailProcessingServiceProps) {
    super(scope, id);

    const { stage, ses, cdn, event } = props;

    const tableName = `poo-email-${stage}-emails`;

    // Create a DynamoDB Table for saving inbound email record
    this.table = new ddb.Table(this, "Table", {
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

    // Create a Lambda Function for handling inbound email event
    this.handler = new lambda.Function(this, "Handler", {
      code: lambda.Code.fromAsset(path.resolve(__dirname, "..", "..", "..", "server", "dist.zip")),
      handler: "handlers/inbound-email.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        INBOUND_EMAIL_PREFIX: ses.prefix,
        ARCHIVED_EMAIL_PREFIX: "emails/archived/",
        CDN_BASE_URL: cdn.baseUrl,
        EMAIL_BUCKET_NAME: ses.bucket.bucketName,
        EMAIL_TABLE_NAME: this.table.tableName,
        EVENT_GATEWAY_BASE_URL: event.baseUrl,
        SUBSCRIPTION_TABLE_NAME: props.event.subscription.table.tableName,
        SUBSCRIPTION_INDEX_NAME: props.event.subscription.index.indexName,
      },
    });

    // Give S3 Access to the processor function
    this.handler.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:GetObjectAcl",
        "s3:PutObject",
        "s3:PutObjectAcl",
      ],
      resources: [
        `${ses.bucket.bucketArn}/*`,
      ],
    }));

    // Give DynamoDB Table access to the processor function
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
        this.table.tableArn,
        props.event.subscription.table.tableArn,
        props.event.subscription.index.indexArn,
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
  }
}
