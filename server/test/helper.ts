import * as sinon from "sinon";
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
