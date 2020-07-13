import * as React from 'react';
import { useHistory } from 'react-router-dom';

import { useTextInput } from '../form';

export function Home() {
  const history = useHistory();

  const [username, onUsernameChange] = useTextInput();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (username) {
      history.push(`/inbox/${encodeURIComponent(username)}`);
    }
  };

  return (
    <>
      <section className="home-hero hero is-fullheight">
        <div className="hero-body">
          <div className="container">
            <h1 className="title is-spaced">
              {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
              <span className="icon">💩 + ✉️</span>
              poo.email
            </h1>
            <h2 className="subtitle">
              poo.email is a disposable email service.
            </h2>

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
      </section>
    </>
  );
}
