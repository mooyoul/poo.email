import * as React from 'react';

export type InboxButtonProps = {
  type?: 'button' | 'submit';
  icon: 'trashcan' | 'refresh' | 'pause' | 'play' | 'back';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export function InboxButton(props: InboxButtonProps) {
  const {
    type = 'button',
    icon,
    disabled,
    onClick,
  } = props;

  return (
    // eslint-disable-next-line
    <button type={type} className="inbox-button" onClick={onClick} disabled={disabled}>
      <i className={`inbox-button-icon ${icon}`} />
    </button>
  );
}
