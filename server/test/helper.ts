import * as sinon from "sinon";
import { Readable } from "stream";
import {
  Middleware,
  Namespace,
  Router,
  Routes,
} from "vingle-corgi";

export const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.verifyAndRestore();
});

export function stubAWSAPI<T>(
  Service: new (...args: any[]) => T,
  method: keyof T,
  fake: sinon.SinonSpy,
) {
  const service = new Service();
  const proto = Object.getPrototypeOf(service);

  return sandbox.stub(proto, method)
    .callsFake((...args: any[]) => {
      return {
        promise: () => Promise.resolve(fake(...args)),
      };
    });
}

export function readStream(stream: Readable) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream
      .on("error", onError)
      .on("data", onData)
      .on("end", onEnd);

    function onData(buf: Buffer) {
      chunks.push(buf);
    }

    function onError(e: Error) {
      stream.removeListener("error", onError);
      stream.removeListener("data", onData);
      stream.removeListener("end", onEnd);

      reject(e);
    }

    function onEnd() {
      stream.removeListener("error", onError);
      stream.removeListener("data", onData);
      stream.removeListener("end", onEnd);

      resolve(Buffer.concat(chunks));
    }
  });
}

export function createResolver(routes: Routes, middlewares?: Middleware[]) {
  const resolver = async function resolve(
    method: string,
    path: string,
    queryStringParameters?: { [key: string]: string },
    headers: { [key: string]: string } = {},
    body?: string,
  ) {
    const router = new Router([
      new Namespace("", {
        children: routes,
        async exceptionHandler(e: Error) {
          console.log(e); // tslint:disable-line
        },
      }),
    ], { middlewares });

    return router.resolve({
      headers,
      httpMethod: method,
      path,
      queryStringParameters,
      body,
      requestContext: {
        stage: "test",
      } as any,
    }, { timeout: 10000 });
  };

  return resolver;
}
