import * as cdk from "@aws-cdk/core";

import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";
import * as s3 from "@aws-cdk/aws-s3";

export interface AssetServiceProps {
  readonly stage: string;
  readonly domainName: string;
  readonly hostedZone: route53.IHostedZone;
}

export class AssetService extends cdk.Construct {
  public readonly distribution: cf.CloudFrontWebDistribution;
  public readonly bucket: s3.Bucket;

  public readonly domainName: string;
  public readonly baseUrl: string;

  public constructor(scope: cdk.Construct, id: string, props: AssetServiceProps) {
    super(scope, id);

    const { stage, hostedZone, domainName } = props;

    const bucketName = `poo-email-${stage}-assets`;

    // Create a S3 Bucket to save inbound emails
    this.bucket = new s3.Bucket(this, "Bucket", {
      bucketName,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: true,
        ignorePublicAcls: false,
        restrictPublicBuckets: true,
      },
      cors: [{
        allowedOrigins: [
          "http://www.lvh.me:8080",
          `https://${hostedZone.zoneName}`,
        ],
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.HEAD,
        ],
      }],
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
          s3BucketSource: this.bucket,
        },
      }],
      enableIpV6: true,
      priceClass: cf.PriceClass.PRICE_CLASS_ALL,
    });

    // Create DNS Record for Distribution
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

    // Expose Outputs
    this.domainName = domainName;
    this.baseUrl = `https://${this.domainName}`;
  }
}
