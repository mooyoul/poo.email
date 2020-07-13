import * as cdk from "@aws-cdk/core";
import * as path from "path";

import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as iam from "@aws-cdk/aws-iam";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3Deploy from "@aws-cdk/aws-s3-deployment";

export interface ClientStackProps extends cdk.StackProps {
  readonly stage: string;
  readonly domainName: string;
  readonly zoneName: string;
}

export class ClientStack extends cdk.Stack {
  public readonly domainName: string;

  public constructor(scope: cdk.App, id: string, props: ClientStackProps) {
    super(scope, id, props);

    const { stage, zoneName, domainName } = props;

    // Lookup Hosted Zone
    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: zoneName,
    });

    const bucketName = `poo-email-${stage}-client`;

    // Create a S3 Bucket to save inbound emails
    const bucket = new s3.Bucket(this, "Bucket", {
      bucketName,
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: false,
        ignorePublicAcls: true,
        restrictPublicBuckets: false,
      },
    });

    // Create CF OAI for S3 access
    const oai = new cf.OriginAccessIdentity(this, "OriginAccessIdentity", {
      comment: `OAI for poo.email client ${stage}`,
    });

    // Grant object read access to created OAI
    const bucketPolicy = new s3.BucketPolicy(this, "BucketPolicy", { bucket });
    bucketPolicy.document.addStatements(new iam.PolicyStatement({
      actions: ["s3:GetObject"],
      principals: [oai.grantPrincipal],
      resources: [`${bucket.bucketArn}/*`],
    }));

    // Create ACM Certificate
    const certificate = new acm.DnsValidatedCertificate(this, "Certificate", {
      domainName,
      hostedZone,
    });

    // Create CF Distribution
    const distribution = new cf.CloudFrontWebDistribution(this, "Distribution", {
      viewerCertificate: cf.ViewerCertificate.fromAcmCertificate(certificate, {
        sslMethod: cf.SSLMethod.SNI,
        securityPolicy: cf.SecurityPolicyProtocol.TLS_V1_2016,
        aliases: [domainName],
      }),
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originConfigs: [{
        behaviors: [{
          isDefaultBehavior: true,
          allowedMethods: cf.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
          cachedMethods: cf.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
          forwardedValues: {
            headers: [
              "Origin",
            ],
            queryString: false,
            cookies: {
              forward: "none",
            },
          },
          compress: true,
          defaultTtl: cdk.Duration.days(365 * 100), // 100 years
          minTtl: cdk.Duration.days(365 * 100), // 100 years
          maxTtl: cdk.Duration.days(365 * 100), // 100 years
        }],
        s3OriginSource: {
          s3BucketSource: bucket,
          originAccessIdentity: oai,
        },
      }],
      enableIpV6: true,
      priceClass: cf.PriceClass.PRICE_CLASS_ALL,
    });

    // Create DNS Record for Distribution
    const cloudfrontTarget = new route53Targets.CloudFrontTarget(distribution);
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

    // Deploy files
    const deployment = new s3Deploy.BucketDeployment(this, "Deployment", {
      sources: [s3Deploy.Source.asset(path.join(__dirname, "..", "..", "client", "dist"))],
      destinationBucket: bucket,
      distribution,
      retainOnDelete: false,
      cacheControl: [
        s3Deploy.CacheControl.setPublic(),
        s3Deploy.CacheControl.maxAge(cdk.Duration.days(365 * 100)), // 100 years
      ],
    });
  }
}
