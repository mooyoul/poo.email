import * as React from 'react';
import { useQuery } from 'react-query';

import * as dayjs from 'dayjs';
import * as localizedFormat from 'dayjs/plugin/localizedFormat';
import * as relativeTime from 'dayjs/plugin/relativeTime';

import { AttachmentCell } from '../attachment-cell';
import { InboxButton } from '../button';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

export type MessageShowProps = {
  mail?: any;
  disabled?: boolean;
  onClose?: () => void;
  onDelete?: () => void;
};

export function MessageShow(props: MessageShowProps) {
  const {
    mail,
    disabled = false,
    onClose,
    onDelete,
  } = props;

  if (!mail) {
    return (
      <div className="message-show">
        <p className="content has-text-centered">
          No message selected.
        </p>
      </div>
    );
  }

  const from = React.useMemo(() => {
    const senders = mail.from.map((sender: any) => (
      sender.name
        ? (
          <React.Fragment key={sender.address}>
            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
            <strong>{sender.name}</strong> &lt;{sender.address}&gt;
          </React.Fragment>
        )
        // eslint-disable-next-line react/jsx-one-expression-per-line
        : <>&lt;{sender.address}&gt;</>
    ));

    return senders;
  }, [mail.from]);

  const date = React.useMemo(() => dayjs(new Date(mail.date)), [mail.date]);

  const { status, data, error } = useQuery(
    `content-${mail.messageId}`,
    () => fetch(mail.content.html)
      .then((res) => res.text()),
    { cacheTime: 300 * 1000, staleTime: Infinity },
  );

  const attachments = React.useMemo(() => (
    mail.attachments
      .filter((attachment: any) => !attachment.related)
  ), [mail.attachments]);

  return (
    <div className="message-show">
      <nav className="message-show-nav">
        <div className="message-show-nav-left">
          <InboxButton icon="back" disabled={disabled} onClick={onClose} />
        </div>
        <div className="message-show-nav-right">
          <InboxButton icon="trashcan" disabled={disabled} onClick={onDelete} />
        </div>
      </nav>
      <h3 className="title">{mail.subject}</h3>
      <div className="message-show-header">
        <div className="message-show-sender">{from}</div>
        <time className="message-show-datetime" dateTime={date.toISOString()}>
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {date.format('LLL')} ({date.fromNow()})
        </time>
      </div>
      { status === 'loading' && (
        <div className="message-show-content">
          <p className="content has-text-centered">
            Loading...
          </p>
        </div>
      ) }

      { error && (
        <div className="message-show-content">
          <p className="content has-text-centered">
            {error.message}
          </p>
        </div>
      ) }

      { data && (
        // eslint-disable-next-line react/no-danger
        <div className="message-show-content" dangerouslySetInnerHTML={{ __html: data }} />
      ) }

      { attachments.length > 0 && (
        <div className="message-show-attachments">
          <h5 className="subtitle">
            { attachments.length === 1
              ? `${attachments.length} attachment`
              : `${attachments.length} attachments`}
          </h5>
          <div className="columns is-multiline">
            { attachments.map((attachment: any) => (
              <div className="column is-half-mobile is-one-quarter-desktop" key={attachment.cid}>
                <AttachmentCell attachment={attachment} />
              </div>
            )) }
          </div>
        </div>
      ) }
    </div>
  );
}
