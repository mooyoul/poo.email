import * as React from 'react';

export type EmptyInboxProps = {
  recipient: string;
};

export function EmptyInbox(props: EmptyInboxProps) {
  const { recipient } = props;

  return (
    <div className="empty-inbox">
      {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
      <span className="empty-inbox-icon">😖</span>
      <h4 className="empty-inbox-title">Oh no!</h4>
      <p className="empty-inbox-content">
        It looks like there are no received messages.
        <br />
        {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
        Send email to <code>{recipient}</code>
      </p>
    </div>
  );
}
