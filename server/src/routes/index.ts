import { Namespace, OpenAPIRoute, Route, Router, Routes, StandardError } from "vingle-corgi";

import { Schemas } from "../presenters";
import { CORSMiddleware } from "./middlewares";

import InboxRoute from "./inbox";
import MessagesRoute from "./messages";

const routes: Routes = [
  InboxRoute,
  MessagesRoute,
];

export const router = new Router([
  new Namespace("/api", {
    async exceptionHandler(error) {
      if (error.name === "ValidationError") {
        return this.json({
          error: {
            id: this.requestId,
            code: "INVALID_PARAMETER",
            message: error.message,
          },
        });
      }

      if (error instanceof StandardError) {
        return this.json({
          error: {
            id: this.requestId,
            code: error.options.code,
            message: error.options.message,
            metadata: error.options.metadata,
          },
        });
      }

      // Unknown Error
      // tslint:disable-next-line
      console.error("Unhandled error found: ", error.stack);
      return this.json({
        error: {
          id: this.requestId,
          code: "INTERNAL_ERROR",
          message: "Internal Server Error",
        },
      });
    },
    children: [
      new OpenAPIRoute("/docs", {
        title: "poo.email API",
        version: "1.0.0",
        definitions: Schemas,
      }, routes),
      ...routes,

      Route.OPTIONS("*", {
        desc: "CORS Preflight Endpoint",
        operationId: "preflightCORS",
        // tslint:disable-next-line
      }, {}, async function() {
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
          body: "OK",
        };
      }),
    ],
  }),
], {
  middlewares: [
    new CORSMiddleware({
      allowedOrigins: [
        "http://www.lvh.me:8080",
        "http://192.168.1.*:8080",
        "https://poo.email",
        "https://*.poo.email",
      ],
      maxAge: 60 * 1000,
    }),
  ],
});
