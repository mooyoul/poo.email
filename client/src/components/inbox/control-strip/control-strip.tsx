import * as React from 'react';
// eslint-disable-next-line no-unused-vars
import { QueryStatus } from 'react-query';

import { InboxButton } from '../button';
import { InboxCheckbox } from '../checkbox';

export type InboxControlStripProps = {
  queryStatus: QueryStatus;
  socketState: 'connected' | 'disconnected' | 'connecting';
  totalMessages: number;
  checkedMessages: {
    size: number;
    [key: string]: any;
  };
  selectedMessage: any;
  onChecked: (checked: boolean, indeterminate: boolean) => void;
  onRefresh: () => void;
  onDelete: () => void;
  onResume: () => void;
  onPause: () => void;
};

export function InboxControlStrip(props: InboxControlStripProps) {
  const {
    queryStatus,
    socketState,
    selectedMessage,
    totalMessages,
    checkedMessages,
    onChecked,
    onRefresh,
    onDelete,
    onResume,
    onPause,
  } = props;

  const onAllCheckChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target?.checked ?? false;
    const indeterminate = e.target?.indeterminate ?? false;

    onChecked(checked, indeterminate);
  }, [onChecked]);

  const allChecked = React.useMemo(
    () => checkedMessages.size > 0 && totalMessages === checkedMessages.size,
    [totalMessages, checkedMessages.size],
  );

  const partialChecked = React.useMemo(
    () => checkedMessages.size > 0 && checkedMessages.size < totalMessages,
    [totalMessages, checkedMessages.size],
  );

  return (
    <div className="inbox-control-strip">
      <div className="inbox-control-strip-left">
        <InboxCheckbox
          checked={allChecked}
          indeterminate={partialChecked}
          onChange={onAllCheckChange}
        />
      </div>
      <div className="inbox-control-strip-controls">
        <InboxButton type="button" icon="trashcan" disabled={checkedMessages.size === 0 && !selectedMessage} onClick={onDelete} />
        <InboxButton type="button" icon="refresh" disabled={queryStatus === 'loading'} onClick={onRefresh} />
      </div>
      <div className="inbox-control-strip-controls">
        { socketState === 'connected' && <InboxButton type="button" icon="pause" onClick={onPause} /> }
        { socketState !== 'connected' && <InboxButton type="button" icon="play" disabled={socketState === 'connecting'} onClick={onResume} /> }
        <p>
          { socketState === 'connected' && 'Listening for new messages...' }
          { socketState === 'connecting' && 'Connecting...' }
          { socketState === 'disconnected' && 'Paused' }
        </p>
      </div>
    </div>
  );
}
