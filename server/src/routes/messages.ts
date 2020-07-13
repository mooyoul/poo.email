import * as Joi from "joi";
import { Namespace, Parameter, PresenterRouteFactory } from "vingle-corgi";

import * as Presenters from "../presenters";
import { EventPushService } from "../services/event-push";
import { EventSubscriptionService } from "../services/event-subscription";
import { Inbox } from "../services/inbox";

const subscriptionService = new EventSubscriptionService();
const pushService = new EventPushService(process.env.EVENT_GATEWAY_BASE_URL!, subscriptionService);

export default new Namespace('/messages', {
  children: [
    PresenterRouteFactory.DELETE("/_batch", {
      desc: "Batch delete messages in given inbox",
      operationId: "batchDeleteMessages",
    }, {
      request: Parameter.Body(Joi.object({
        recipient: Joi.string().email().required(),
        messageIds: Joi.array().items(Joi.string()).min(1).required(),
      }).required()),
    }, Presenters.Succeed,  async function() {
      const recipient = this.params.request.recipient as string;
      const messageIds = this.params.request.messageIds as string[];

      const inbox = Inbox.of(recipient);

      await inbox.batchDelete(messageIds);

      await pushService.broadcast(recipient, {
        topic: recipient,
        type: "mail_deleted",
        data: messageIds,
      });

      return true;
    }),
  ],
});
