export type EmailAddress = {
  address: string;
  name: string;
  group?: {
    address: string;
    name: string;
  }[];
};

export type Attachment = {
  cid?: string;
  mime?: string;
  key: string;
  name?: string;
  size?: number;
  related: boolean;
};

export type Mail = {
  from?: EmailAddress[];
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  date?: number;
  subject?: string;
  summary: string;
  content: {
    text: string;
    textAsHtml: string;
    html: string;
  };
  attachments?: Attachment[];
};
