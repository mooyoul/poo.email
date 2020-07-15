import { OpenAPIRoute, Route } from "vingle-corgi";

import { CORSMiddleware } from "../../../src/routes/middlewares";
import { createResolver } from "../../helper";

describe(CORSMiddleware.name, () => {
  const routes = [
    Route.GET("/basic", {
      operationId: "basic",
      desc: "basic",
    }, {}, async function() {
      return this.json({ foo: "bar" });
    }),
    Route.GET("/defined", {
      operationId: "defined",
      desc: "defined",
    }, {}, async function() {
      return this.json({ foo: "bar" }, 200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Max-Age": "123",
      });
    }),
  ];

  const resolve = createResolver([
    ...routes,
    new OpenAPIRoute("/openapi", {
      title: "OpenAPI",
      version: "1.0.0",
    }, routes),
  ], [
    new CORSMiddleware({
      allowedOrigins: ["https://example.com", "https://*.lvh.me:8080"],
      maxAge: 60 * 1000,
    }),
  ]);

  it("should reject CORS request if given origin is not allowed", async () => {
    const res = await resolve("GET", "/basic", {}, {
      Origin: "https://unknown.net",
    });

    const status = res.statusCode;
    const body = JSON.parse(res.body);

    expect(status).toEqual(403);
    expect(body).toMatchObject({
      error: {
        code: "FORBIDDEN",
      },
    });
  });

  it("should allow CORS request if given origin is allowed", async () => {
    const res = await resolve("GET", "/basic", {}, {
      Origin: "https://example.com",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "Content-Type",
    });

    const status = res.statusCode;
    const headers = res.headers;

    expect(status).toEqual(200);
    expect(headers).toMatchObject({
      "Access-Control-Allow-Origin": "https://example.com",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "60",
    });
  });

  it("should handle wildcard in allowed origin", async () => {
    const res = await resolve("GET", "/basic", {}, {
      Origin: "https://foo.bar.baz.lvh.me:8080",
    });

    const status = res.statusCode;
    const headers = res.headers;

    expect(status).toEqual(200);
    expect(headers).toMatchObject({
      "Access-Control-Allow-Origin": "https://foo.bar.baz.lvh.me:8080",
    });
  });

  it("should allow CORS request if given route is OpenAPI Route", async () => {
    const res = await resolve("GET", "/openapi", {}, {
      Origin: "https://unknown.net",
    });

    const status = res.statusCode;

    expect(status).toEqual(200);
  });

  it("should keep original CORS related response headers if defined", async () => {
    const res = await resolve("GET", "/defined", {}, {
      Origin: "https://example.com",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "Content-Type",
    });

    const status = res.statusCode;
    const headers = res.headers;

    expect(status).toEqual(200);
    expect(headers).toMatchObject({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Max-Age": "123",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    });
  });
});
