#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";

import { BaseStack } from "../lib/base-stack";
import { ClientStack } from "../lib/client-stack";
import { ServerStack } from "../lib/server-stack";

const app = new cdk.App();

const ZONE_NAME = "poo.email";
const DOMAIN_NAME = "poo.email";
const RECEIPT_RULE_SET_NAME = "Default";

// tslint:disable-next-line
new BaseStack(app, "PooEmailBase", {
  zoneName: ZONE_NAME,
});

// tslint:disable-next-line
new ServerStack(app, "PooEmailServer", {
  stage: "prod",
  domainName: DOMAIN_NAME,
  zoneName: ZONE_NAME,
  receiptRuleSet: RECEIPT_RULE_SET_NAME,
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT!,
  },
});

// tslint:disable-next-line
new ClientStack(app, "PooEmailClient", {
  stage: "prod",
  domainName: DOMAIN_NAME,
  zoneName: ZONE_NAME,
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT!,
  },
});
