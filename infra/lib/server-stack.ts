import * as cdk from "@aws-cdk/core";

import * as route53 from "@aws-cdk/aws-route53";

import {
  APIService,
  AssetService,
  EmailInboundService,
  EmailProcessingService,
  EventGatewayService,
} from "./services";

export interface ServerStackProps extends cdk.StackProps {
  readonly stage: string;
  readonly domainName: string;
  readonly zoneName: string;
  readonly receiptRuleSet: string;
}

export class ServerStack extends cdk.Stack {
  public readonly domainName: string;

  public constructor(scope: cdk.App, id: string, props: ServerStackProps) {
    super(scope, id, props);

    const { stage, zoneName, receiptRuleSet } = props;
    this.domainName = props.domainName;

    const prefix = "emails/raw/";

    // Lookup Hosted Zone
    const zone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: zoneName,
    });

    // Create a Asset Service to save & serve email contents
    const assetService = new AssetService(this, "AssetService", {
      stage,
      hostedZone: zone,
      domainName: `a.${this.domainName}`,
    });

    // Create Event Service to provide real-time events via WebSocket
    const eventGatewayService = new EventGatewayService(this, "EventService", {
      stage,
      hostedZone: zone,
      domainName: `events.${this.domainName}`,
    });

    // Create Mail Processor function to handle incoming emails
    const emailProcessingService = new EmailProcessingService(this, "ProcessingService", {
      stage,
      event: {
        baseUrl: eventGatewayService.baseUrl,
        arn: eventGatewayService.apiStageArn,
        subscription: eventGatewayService.subscription,
      },
      ses: {
        bucket: assetService.bucket,
        prefix,
      },
      cdn: {
        baseUrl: assetService.baseUrl,
      },
    });

    // Configure SES to receive email and save received email to given bucket
    const emailInboundService = new EmailInboundService(this, "InboundService", {
      domainName: this.domainName,
      hostedZone: zone,
      handler: emailProcessingService.handler,
      bucket: assetService.bucket,
      prefix,
      receiptRuleSet,
    });

    // Configure API Service
    const apiService = new APIService(this, "APIService", {
      stage,
      domainName: `api.${this.domainName}`,
      hostedZone: zone,
      emailTable: emailProcessingService.table,
      event: {
        baseUrl: eventGatewayService.baseUrl,
        arn: eventGatewayService.apiStageArn,
        subscription: eventGatewayService.subscription,
      },
      cdn: {
        baseUrl: assetService.baseUrl,
      },
    });
  }
}
