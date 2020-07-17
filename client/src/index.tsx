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
import { useTracking } from './components/use-tracking';

function App() {
  useTracking({
    gaMeasurementId: process.env.GA_MEASUREMENT_ID,
  });

  return (
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
  );
}

ReactDOM.render((
  <HashRouter>
    <App />
  </HashRouter>
), document.getElementById('app'));
