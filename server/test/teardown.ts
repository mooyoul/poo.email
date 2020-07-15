import { InboxMail } from "../src/models/inbox-mail";
import { Subscription } from "../src/models/subscription";

const Models = [InboxMail, Subscription];

export = async () => {
  for (const Model of Models) {
    await Model.dropTable();
  }
};
