import * as cdk from "@aws-cdk/core";

import * as lambda from "@aws-cdk/aws-lambda";
import * as route53 from "@aws-cdk/aws-route53";
import * as s3 from "@aws-cdk/aws-s3";
import * as ses from "@aws-cdk/aws-ses";
import * as sesActions from "@aws-cdk/aws-ses-actions";
import { DnsValidatedDomainIdentity } from "aws-cdk-ses-domain-identity";

export interface EmailInboundServiceProps {
  readonly domainName: string;
  readonly hostedZone: route53.IHostedZone;
  readonly bucket: s3.Bucket;
  readonly handler: lambda.IFunction;
  readonly prefix: string;
  readonly receiptRuleSet: string;
}

export class EmailInboundService extends cdk.Construct {
  public readonly domainName: string;
  public readonly hostedZone: route53.IHostedZone;
  public readonly identity: DnsValidatedDomainIdentity;
  public readonly receiptRuleSet: ses.IReceiptRuleSet;
  public readonly region = "us-east-1";
  public readonly prefix: string;

  public constructor(scope: cdk.Construct, id: string, props: EmailInboundServiceProps) {
    super(scope, id);

    const { bucket, handler, receiptRuleSet } = props;
    this.domainName = props.domainName;
    this.hostedZone = props.hostedZone;
    this.prefix = props.prefix;

    // Reference existing Receipt Rule Set
    this.receiptRuleSet = ses.ReceiptRuleSet.fromReceiptRuleSetName(this, "ReceiptRuleSet", receiptRuleSet);

    // Create DNS-validated SES Domain Identity
    this.identity = new DnsValidatedDomainIdentity(this, "Identity", {
      domainName: this.domainName,
      hostedZone: this.hostedZone,
      region: this.region,
      dkim: true,
    });

    bucket.addLifecycleRule({
      id: "delete-old-archived-mail",
      enabled: true,
      prefix: this.prefix,
      abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
      expiration: cdk.Duration.days(3),
    });

    // Create SES Receipt Rule
    this.receiptRuleSet.addRule("ReceiptRule", {
      enabled: true,
      recipients: [this.domainName],
      scanEnabled: true,
      actions: [
        new sesActions.S3({
          bucket,
          objectKeyPrefix: this.prefix,
        }),
        new sesActions.Lambda({
          function: handler,
          invocationType: sesActions.LambdaInvocationType.EVENT,
        }),
      ],
    });

    // Create MX Records
    const recordName = (() => {
      const index = this.domainName.indexOf(this.hostedZone.zoneName);

      return index > 0
        ? this.domainName.slice(0,  index - 1)
        : "";
    })();

    const mxRecord = new route53.MxRecord(this, "MXRecord", {
      recordName,
      zone: this.hostedZone,
      values: [{
        priority: 10,
        hostName: `inbound-smtp.${this.region}.amazonaws.com`,
      }],
    });
  }
}
