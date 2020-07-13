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
    <div className="columns is-vcentered is-multiline px-3">
      <div className="column is-auto">
        {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
        <h2 className="subtitle">Inbox of <span className="code">{recipient}</span></h2>
      </div>
      <div className="column is-one-third-tablet is-one-quarter-desktop">
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
