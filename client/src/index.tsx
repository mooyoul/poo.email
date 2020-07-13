import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  HashRouter,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom';

import './index.sass';

import { Home } from './components/home';
import { Inbox } from './components/inbox';

function App() {
  return (
    <HashRouter>
      <Switch>
        <Route exact path="/">
          <Home />
        </Route>
        <Route path="/inbox/:username">
          <Inbox />
        </Route>
        <Route path="*">
          <Redirect to={{ pathname: '/' }} />
        </Route>
      </Switch>
    </HashRouter>
  );
}

ReactDOM.render((<App />), document.getElementById('app'));
