import * as cdk from "@aws-cdk/core";

import * as route53 from "@aws-cdk/aws-route53";

export interface BaseStackProps extends cdk.StackProps {
  readonly zoneName: string;
}

export class BaseStack extends cdk.Stack {
  public readonly hostedZone: route53.HostedZone;

  public constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const { zoneName } = props;

    this.hostedZone = new route53.HostedZone(this, "HostedZone", { zoneName });
  }
}
