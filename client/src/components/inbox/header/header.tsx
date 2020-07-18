import * as React from 'react';
import { useHistory } from 'react-router-dom';

import { useTextInput } from '../../form';

export type InboxHeaderProps = {
  recipient: string;
}

export function InboxHeader(props: InboxHeaderProps) {
  const { recipient } = props;
  const history = useHistory();

  const [username, onUsernameChange] = useTextInput();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (username) {
      history.push(`/inbox/${encodeURIComponent(username)}`);
    }
  };

  return (
    <div className="inbox-header">
      <div className="inbox-header-left">
        {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
        <h2 className="subtitle">Inbox of <code>{recipient}</code></h2>
      </div>
      <div className="inbox-header-right">
        <form onSubmit={onSubmit}>
          <div className="field has-addons">
            <div className="control is-expanded">
              <input className="input" name="username" type="text" placeholder="Pick a Username" value={username} onChange={onUsernameChange} required />
            </div>
            <div className="control">
              <button type="submit" className="button is-dark">View Inbox</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
