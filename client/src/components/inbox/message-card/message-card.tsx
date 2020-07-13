import * as React from 'react';
import * as dayjs from 'dayjs';

import { InboxCheckbox } from '../checkbox';

export type MessageCardProps = {
  mail: any;
  onSelect: (mail: any) => void;
  onCheck: (mail: any) => void;
  onUncheck: (mail: any) => void;
  selected?: boolean;
  checked?: boolean;
};

export function MessageCard(props: MessageCardProps) {
  const {
    mail,
    selected = false,
    checked = false,
    onSelect,
    onCheck,
    onUncheck,
  } = props;

  const cardClassName = React.useMemo(() => (
    !selected
      ? 'message-card'
      : 'message-card is-selected'
  ), [selected]);

  const onClickContainer = React.useCallback(() => {
    if (!selected) {
      onSelect(mail);
    }
  }, [selected]);

  const onClickAddons = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  const onCheckChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onCheck(mail);
    } else {
      onUncheck(mail);
    }
  }, []);

  const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    const pressed = e.keyCode === 0x0d || e.keyCode === 0x20;

    if (!selected && pressed) {
      onSelect(mail);
    }
  }, [selected]);

  const from = React.useMemo(() => mail.from.map((sender: any) => (
    sender.name
      ? `${sender.name} (${sender.address})`
      : sender.address
  )).join(', '), [mail.from]);
  const date = React.useMemo(() => new Date(mail.date), [mail.date]);

  return (
    /* eslint-disable */
    <div
      className={cardClassName}
      aria-expanded={selected}
      onClick={onClickContainer}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <div className="message-card-addons" onClick={onClickAddons}>
        <InboxCheckbox checked={checked} onChange={onCheckChange} />
      </div>
      { /* eslint-enable */ }
      <div className="message-card-content">
        <div className="message-card-header">
          <strong className="message-card-sender">{from}</strong>
          <time className="message-card-datetime" dateTime={date.toISOString()}>
            {dayjs(date).format('YYYY-MM-DD')}
          </time>
        </div>
        <strong className="message-card-subject">{mail.subject}</strong>
        <p className="message-card-summary">{mail.summary}</p>
      </div>
    </div>
  );
}
