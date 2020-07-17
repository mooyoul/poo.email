import * as React from 'react';

export function LoadingIndicatorBar() {
  /* eslint-disable */
  return (
    <div className="md-progress-linear" role="progressbar">
      <div className="md-container md-mode-indeterminate">
        <div className="md-dashed" />
        <div className="md-bar md-bar1" />
        <div className="md-bar md-bar2" />
      </div>
    </div>
  );
  /* eslint-enable */
}
