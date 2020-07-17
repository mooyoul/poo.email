## poo.email Infra

This directory contains IaC (Infrastructure as a Code) code of [poo.email](https://poo.email)

## Preparation

Make sure you've configured your own AWS credentials locally.

Since SES only one active single Rule Set, You'll have to create your own SES RuleSet manually in the AWS Console
and activate created SES RuleSet.

Also, You'll have to create Route53 Hosted Zone. If you need to provision Route53 Route zone,
You can provision your own Hosted Zone using `BaseStack`:

```
$ npm run cdk -- deploy PooEmailBase
```

Luckily, This IaC provides automatic SES Domain Verification & SES Domain Configuration.
So you don't have to verify SES Domain, configure MX Records neither.   
 

## Getting Started

```
$ npm ci
$ vim bin/app.ts # Edit Stack parameters
```

## Bootstrapping

If you are trying AWS CDK first time, You'll need to bootstrap required resources to continue:

```
$ npm run cdk -- bootstrap
``` 

## Deploying Client

Before deploying client, Make sure Client application has been built.

```
$ npm run cdk -- deploy PooEmailClient
```

## Deploying Server

Before deploy server, Make sure Server application has been packaged.

```
$ npm run cdk -- deploy PooEmailServer
```


## Testing

```
$ npm test
```

