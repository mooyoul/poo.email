import { SESEvent, SESRecord } from "../types/ses";

import * as path from "path";
import * as Presenter from "../presenters";
import { EventPushService } from "../services/event-push";
import { EventSubscriptionService } from "../services/event-subscription";
import { Inbox } from "../services/inbox";
import { MailImporter } from "../services/mail-importer";
import { Storage } from "../services/storage";

const storage = new Storage(process.env.EMAIL_BUCKET_NAME!);
const importer = new MailImporter({
  storage,
  expiresInDays: 1,
  baseUrl: process.env.CDN_BASE_URL!,
});

const subscriptionService = new EventSubscriptionService();
const pushService = new EventPushService(process.env.EVENT_GATEWAY_BASE_URL!, subscriptionService);

export async function handler(event: SESEvent) {
  // tslint:disable-next-line
  console.log("Records: %j", event.Records);

  for (const record of event.Records) {
    await processRecord(record).catch((e) => {
      // tslint:disable
      console.error("Failed to process record: ", e.stack);
      console.error("Failed record: %j", record);
      // tslint:enable
    });
  }
}

async function processRecord(record: SESRecord): Promise<void> {
  const { ses } = record;

  const { messageId } = ses.mail;
  const { recipients } = ses.receipt;

  const source = path.join(process.env.INBOUND_EMAIL_PREFIX!, messageId);
  const destination = path.join(process.env.ARCHIVED_EMAIL_PREFIX!, messageId);

  const mail = await importer.import(source, destination);

  for (const recipient of recipients) {
    const inbox = Inbox.of(recipient);

    if (inbox.reserved) {
      const mailRecord = await inbox.add(mail);
      console.log("wrote: ", mailRecord); // tslint:disable-line
    } else {
      const mailRecord = await inbox.add(mail, 86400 * 1000); // 1 day
      console.log("wrote: ", mailRecord); // tslint:disable-line

      const rendered = await Presenter.MailShow.present(mailRecord);
      const event = {
        topic: recipient,
        type: "mail_received",
        ...rendered,
      };

      await pushService.broadcast(recipient, event);
    }
  }
}
