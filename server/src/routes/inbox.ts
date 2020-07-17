import * as Joi from "joi";
import { Namespace, Parameter, PresenterRouteFactory } from "vingle-corgi";

import * as Presenters from "../presenters";
import { Inbox } from "../services/inbox";

export default new Namespace('/inbox', {
  children: [
    PresenterRouteFactory.GET("", {
      desc: "List messages in given recipient inbox",
      operationId: "listInbox",
    }, {
      recipient: Parameter.Query(Joi.string().email().required()),
      after: Parameter.Query(Joi.string().optional()),
      count: Parameter.Query(Joi.number().integer().positive().max(100).optional().default(50)),
    }, Presenters.MailPaginatedList,  async function() {
      const recipient = this.params.recipient as string;
      const after = this.params.after as string | undefined;
      const count = this.params.count as number;

      const inbox = Inbox.of(recipient);

      if (inbox.reserved) {
        return {
          data: [],
          paging: {},
        };
      }

      return await inbox.list(count, after);
    }),
  ],
});
