// @see https://docs.aws.amazon.com/ses/latest/DeveloperGuide/receiving-email-action-lambda-event.html
// @see https://docs.aws.amazon.com/ses/latest/DeveloperGuide/receiving-email-notifications-contents.html#receiving-email-notifications-contents-mail-object
export type SESHeader = {
  name: string;
  value: string;
};

export type SESCommonHeaders = Partial<{
  // The ID of the original message.
  messageId: string; // "<F8098FDD-49A3-442D-9935-F6112B195BDA@example.com>"

  // The date and time when Amazon SES received the message.
  date: string; // "Mon, 5 Aug 2019 21:29:57 +0000"

  // The values in the To header of the email.
  to: string[]; // ["\"recipient@example.com\" <recipient@example.com>"]

  // The values in the CC header of the email.
  cc: string[];

  // The values in the BCC header of the email.
  bcc: string[];

  // The values in the From header of the email.
  from: string[]; // ["\"Doe, John\" <sender@example.com>"]

  // The values in the Sender header of the email.
  sender: unknown;

  // The values in the Return-Path header of the email.
  returnPath: string; // "prvs=144d0cba7=sender@example.com"

  // The values in the Reply-To header of the email.
  "reply-to": string;

  // The value of the Subject header for the email.
  subject: string; // "This is a test"
}>;

export type SESMail = {
  timestamp: string; // "2019-08-05T21:30:02.028Z"
  source: string; // "prvs=144d0cba7=sender@example.com"
  messageId: string; // "EXAMPLE7c191be45-e9aedb9a-02f9-4d12-a87d-dd0099a07f8a-000000"
  destination: string[]; // ["recipient@example.com"]
  headersTruncated: boolean; // false
  headers: SESHeader[];
  commonHeaders: SESCommonHeaders;
};

export type SESSpamVerdictStatus =
  // The spam scan determined that the message is unlikely to contain spam.
  "PASS"

  // The spam scan determined that the message is likely to contain spam.
  | "FAIL"

  // Amazon SES scanned the email but could not determine with confidence whether it is spam.
  | "GRAY"

  // Amazon SES was unable to scan the email. For example, the email is not a valid MIME message.
  | "PROCESSING_FAILED"
;

export type SESVirusVerdictStatus =
  // The message does not contain a virus.
  "PASS"

  // The message contains a virus.
  | "FAIL"

  // Amazon SES scanned the email but could not determine with confidence whether it contains a virus.
  | "GRAY"

  // Amazon SES is unable to scan the content of the email. For example, the email is not a valid MIME message.
  | "PROCESSING_FAILED"
;

export type SESDkimVerdictStatus =
  // The message passed DKIM authentication.
  "PASS"

  // The message failed DKIM authentication.
  | "FAIL"

  // The message is not DKIM-signed.
  | "GRAY"

  // There is an issue that prevents Amazon SES from checking the DKIM signature.
  // For example, DNS queries are failing or the DKIM signature header is not formatted properly.
  | "PROCESSING_FAILED"
;

export type SESDmarcVerdictStatus =
  // The message passed DMARC authentication.
  "PASS"

  // The message failed DMARC authentication.
  | "FAIL"

  // The message failed DMARC authentication,
  // and the sending domain does not have a DMARC policy, or uses the p=none policy.
  | "GRAY"

  // There is an issue that prevents Amazon SES from providing a DMARC verdict.
  | "PROCESSING_FAILED"
;

export type SESSpfVerdictStatus =
  // The message passed SPF authentication.
  "PASS"

  // The message failed SPF authentication.
  | "FAIL"

  // There is no SPF policy under the domain used in the MAIL FROM command.
  | "GRAY"

  // There is an issue that prevents Amazon SES from checking the SPF record.
  // For example, DNS queries are failing.
  | "PROCESSING_FAILED"
;

export type SESLambdaAction = {
  type: "Lambda";
  functionArn: string; // "arn:aws:lambda:us-east-1:123456789012:function:IncomingEmail",
  invocationType: "Event" | "RequestResponse";
};

export type SESReceipt = {
  timestamp: string; // "2019-08-05T21:30:02.028Z"
  processingTimeMillis: number; // 1205
  recipients: string[]; // ["recipient@example.com"]
  spamVerdict: {
    status: SESSpamVerdictStatus;
  };
  virusVerdict: {
    status: SESVirusVerdictStatus;
  };
  spfVerdict: {
    status: SESSpfVerdictStatus;
  };
  dkimVerdict: {
    status: SESDkimVerdictStatus;
  };
  dmarcVerdict: {
    status: SESDmarcVerdictStatus;
  };
  action: SESLambdaAction;
};

export type SESRecord = {
  eventSource: string; // "aws:ses"
  eventVersion: string; // "1.0"
  ses: {
    mail: SESMail;
    receipt: SESReceipt;
  };
};

export type SESEvent = {
  Records: SESRecord[];
};
