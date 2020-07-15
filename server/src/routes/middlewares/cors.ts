import * as nanomatch from "nanomatch";
import { Middleware, MiddlewareAfterOptions, MiddlewareBeforeOptions, Response } from "vingle-corgi";

export type CORSMiddlewareOptions = {
  readonly allowedOrigins: string[];
  readonly maxAge?: number;
};

export class CORSMiddleware implements Middleware<never> {
  private readonly allowedOrigins: Set<string>;
  private readonly maxAge: number;

  public constructor(options: CORSMiddlewareOptions) {
    this.allowedOrigins = new Set<string>(options.allowedOrigins);
    this.maxAge = options.maxAge ?? 300;
  }

  public async before(options: MiddlewareBeforeOptions<never>): Promise<Response | void> {
    const ctx = options.routingContext;
    const { headers } = ctx;

    if (headers.origin && !this.isAllowedOrigin(headers.origin)) {
      return ctx.json({
        error: {
          code: "FORBIDDEN",
          message: "Forbidden",
        },
      }, 403);
    }
  }

  public async after(options: MiddlewareAfterOptions<never>): Promise<Response> {
    const { response } = options;
    const { headers } = options.routingContext;

    if (headers.origin) {
      const requestedMethod = headers['access-control-request-method'];
      const requestedHeaders = headers['access-control-request-headers'];

      const corsHeaders: { [key: string]: string } = {
        "Access-Control-Allow-Origin": headers.origin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": Math.floor(this.maxAge / 1000).toString(),
      };

      if (requestedMethod) {
        corsHeaders['Access-Control-Allow-Methods'] = requestedMethod;
      }

      if (requestedHeaders) {
        corsHeaders["Access-Control-Allow-Headers"] = requestedHeaders;
      }

      return {
        ...response,
        headers: {
          ...corsHeaders,
          ...response.headers,
        },
      };
    }

    return response;
  }

  private isAllowedOrigin(origin: string): boolean {
    for (const allowedOrigin of this.allowedOrigins) {
      const matched = allowedOrigin.includes("*")
        ? nanomatch.contains(origin, allowedOrigin)
        : origin === allowedOrigin;

      if (matched) {
        return true;
      }
    }

    return false;
  }
}
