import * as React from 'react';
import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="inbox-navbar navbar" role="navigation" aria-label="main navigation">
      <div className="navbar-brand">
        <Link to="/" className="navbar-item">
          {/* eslint-disable-next-line */}
          <span className="icon">💩 + ✉️</span> poo.email
        </Link>
      </div>
    </nav>
  );
}
