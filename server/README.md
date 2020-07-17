## poo.email Server

This directory contains Server application code of [poo.email](https://poo.email)

## Getting Started

```
$ npm ci
```

## Building

```
$ npm run build
```

If you want to package, use `pack` script:

```
$ npm run pack
```

## Testing

Make sure [dynamodb-local](https://hub.docker.com/r/amazon/dynamodb-local/) is running locally. 

```
$ npm run test:local
```

## Deploying

See [infra/README.md](../infra/README.md)
