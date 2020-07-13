import { Static, Type } from '@sinclair/typebox';
import { Presenter } from "vingle-corgi";

import { InboxMail } from "../models/inbox-mail";

const CDN_BASE_URL = (process.env.CDN_BASE_URL || "")
  .replace(/\/?$/i, "");

const Address = Type.Object({
  address: Type.String(),
  name: Type.String(),
  group: Type.Optional(Type.Array(Type.Object({
    address: Type.String(),
    name: Type.String(),
  }))),
});

const Mail = Type.Object({
  recipient: Type.String({ format: "email" }),
  messageId: Type.String(),
  from: Type.Optional(Type.Array(Address)),
  to: Type.Optional(Type.Array(Address)),
  cc: Type.Optional(Type.Array(Address)),
  bcc: Type.Optional(Type.Array(Address)),
  date: Type.Optional(Type.Integer()),
  subject: Type.Optional(Type.String()),
  summary: Type.String(),
  content: Type.Object({
    text: Type.String(),
    textAsHtml: Type.String(),
    html: Type.String(),
  }),
  attachments: Type.Optional(Type.Array(Type.Object({
    cid: Type.Optional(Type.String()),
    mime: Type.Optional(Type.String()),
    url: Type.String({ format: "uri" }),
    name: Type.Optional(Type.String()),
    size: Type.Optional(Type.Integer()),
    related: Type.Boolean(),
  }))),
});

type MailType = Static<typeof Mail>;

export const Schemas = {
  Mail,
};

export const presenter: Presenter<InboxMail, MailType> = {
  outputJSONSchema: () => ({
    items: { $ref: "#/components/schemas/Mail" },
  }),
  present: async (input: InboxMail) => (await arrayPresenter.present([input]))[0],
};

export const arrayPresenter: Presenter<InboxMail[], MailType[]> = {
  outputJSONSchema: () => ({
    type: "array",
    items: { $ref: "#/components/schemas/Mail" },
  }),
  present: async (inputs: InboxMail[]) => inputs.map((input) => ({
    recipient: input.recipient,
    messageId: input.messageId,
    from: input.mail.from,
    to: input.mail.to,
    bcc: input.mail.bcc,
    date: input.mail.date,
    subject: input.mail.subject,
    summary: input.mail.summary,
    content: {
      text: `${CDN_BASE_URL!}/${input.mail.content.text}`,
      textAsHtml: `${CDN_BASE_URL!}/${input.mail.content.textAsHtml}`,
      html: `${CDN_BASE_URL!}/${input.mail.content.html}`,
    },
    attachments: input.mail.attachments?.map((attachment) => ({
      cid: attachment.cid,
      mime: attachment.mime,
      url: `${CDN_BASE_URL}/${attachment.key}`,
      name: attachment.name,
      size: attachment.size,
      related: attachment.related,
    })),
  })),
};
