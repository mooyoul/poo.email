import axios from 'axios';
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { queryCache, useQuery, useMutation } from 'react-query';

import { useSocket } from '../use-socket';
import { InboxControlStrip } from './control-strip';
import { EmptyInbox } from './empty-inbox';
import { InboxHeader } from './header';
import { MessageCard } from './message-card';
import { MessageShow } from './message-show';
import { Navbar } from './navbar';
import { SplitView } from './split-view';

const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL!,
});

export function Inbox() {
  const { username } = useParams();
  const recipient = `${username}@poo.email`;
  const queryKey = `inbox-${username}`;

  const [selectedMessage, setSelectedMessage] = React.useState<any>(null);

  const {
    socketState,
    container,
    connect,
    disconnect,
  } = useSocket(process.env.EVENT_GATEWAY_ENDPOINT!);

  const onMessage = (e: MessageEvent) => {
    const message = (() => {
      try {
        return JSON.parse(e.data);
      } catch (ex) {
        console.error(ex); // eslint-disable-line
        return null;
      }
    })();

    if (message?.type === 'mail_received' && message.topic === recipient) {
      queryCache.setQueryData(queryKey, (old: any[]) => [
        message.data,
        ...old,
      ]);
    }

    if (message?.type === 'mail_deleted' && message.topic === recipient) {
      const deletedMessageIds = new Map<string, true>(
        (message.data || []).map((id: string) => [id, true]),
      );

      // console.log('before selectedMessage: ', selectedMessage);

      queryCache.setQueryData(
        queryKey,
        (old: any[]) => old.filter((mail) => !deletedMessageIds.has(mail.messageId)),
      );

      // console.log('after selectedMessage: ', selectedMessage);

      if (selectedMessage && deletedMessageIds.has(selectedMessage.messageId)) {
        // console.log('wut');
        setSelectedMessage(null);
      }
    }
  };

  const onConnect = React.useCallback(() => {
    container.socket!.send(JSON.stringify({
      type: 'subscribe',
      data: { topic: recipient },
    }));
  }, [username]);

  let removeListeners = () => {};

  React.useEffect(() => {
    removeListeners = connect(onConnect, onMessage);

    return () => {
      if (container.socket) {
        if (container.socket.readyState === 1) {
          container.socket.send(JSON.stringify({
            type: 'unsubscribe',
            data: { topic: recipient },
          }));
        }

        removeListeners();
      }
    };
  }, [username]);

  const onResume = React.useCallback(() => {
    removeListeners();
    removeListeners = connect(onConnect, onMessage);
  }, []);

  const onPause = React.useCallback(() => {
    disconnect();
  }, []);

  const {
    status,
    data,
    error,
    isFetching,
  } = useQuery<any[], string>(
    queryKey,
    () => (
      apiClient({
        url: '/inbox',
        params: {
          recipient,
        },
      }).then((res) => res.data.data)
    ), {
      staleTime: 60 * 5 * 1000, // 5 minutes
      cacheTime: 0, // disable cache
    },
  );

  const messages = React.useMemo(() => (data || []), [data]);

  const [batchDeleteMail, batchDeleteMailState] = useMutation((messageIds: string[]) => (
    apiClient({
      method: 'DELETE',
      url: '/messages/_batch',
      data: {
        request: {
          recipient,
          messageIds,
        },
      },
    }).then((res) => res.data)
  ), {
    onSuccess: (_: any, messageIds) => {
      const deletedMessageIds = new Map<string, true>(messageIds.map((m) => [m, true]));

      queryCache.setQueryData(
        queryKey,
        (old: any[]) => old.filter((mail: any) => !deletedMessageIds.has(mail.messageId)),
      );
    },
  });

  const totalMessages = React.useMemo(
    () => messages.length,
    [messages],
  );

  const onSelectionChange = React.useCallback((mail: any) => {
    setSelectedMessage(mail);
  }, []);

  const [checkedMessages, setCheckedMessages] = React.useState<{
    size: number;
    [key: string]: any;
  }>({ size: 0 });
  const onChecked = React.useCallback((mail: any) => {
    setCheckedMessages((value) => ({
      ...value,
      [mail.messageId]: mail,
      size: value.size + 1,
    }));
  }, []);
  const onUnchecked = React.useCallback((mail: any) => {
    setCheckedMessages((value) => ({
      ...value,
      [mail.messageId]: null,
      size: value.size - 1,
    }));
  }, []);

  const refresh = React.useCallback(() => {
    queryCache.invalidateQueries(queryKey);
  }, []);

  const onAllChecked = React.useCallback((checked: boolean) => {
    if (checked) {
      setCheckedMessages({
        size: totalMessages,
        ...messages.reduce((hash, mail) => ({
          ...hash,
          [mail.messageId]: mail,
        }), {}),
      });
    } else {
      setCheckedMessages({
        size: 0,
      });
    }
  }, [data]);

  const unselect = React.useCallback(() => {
    setSelectedMessage(null);
  }, [selectedMessage]);

  const deleteSelected = React.useCallback(() => {
    if (selectedMessage) {
      batchDeleteMail([selectedMessage.messageId])
        .then(() => unselect());
    }
  }, [selectedMessage]);

  const onDelete = React.useCallback(() => {
    if (checkedMessages.size > 0) {
      const messageIds = Object.keys(checkedMessages)
        .filter((key) => key !== 'size');

      batchDeleteMail(messageIds)
        .then(() => {
          setCheckedMessages({ size: 0 });
        });
    } else {
      deleteSelected();
    }
  }, [selectedMessage, checkedMessages]);

  return (
    <>
      <Navbar />
      <InboxHeader recipient={recipient} />
      <SplitView
        header={(
          <InboxControlStrip
            queryStatus={status}
            socketState={socketState}
            selectedMessage={selectedMessage}
            totalMessages={totalMessages}
            checkedMessages={checkedMessages}
            onChecked={onAllChecked}
            onDelete={onDelete}
            onRefresh={refresh}
            onResume={onResume}
            onPause={onPause}
          />
        )}
        left={(
          <>
            {isFetching && (
              <div>Fetching...</div>
            )}
            {error && (
              // eslint-disable-next-line react/jsx-one-expression-per-line
              <p>Error: {error.message}</p>
            )}
            {status === 'success' && messages.length > 0 && messages.map((mail: any) => (
              <MessageCard
                mail={mail}
                key={mail.messageId}
                onSelect={onSelectionChange}
                selected={mail.messageId === selectedMessage?.messageId}
                checked={!!checkedMessages[mail.messageId]}
                onCheck={onChecked}
                onUncheck={onUnchecked}
              />
            ))}
            {status === 'success' && messages.length === 0 && (
              <EmptyInbox recipient={recipient} />
            )}
          </>
        )}
        right={(
          <MessageShow
            mail={selectedMessage}
            disabled={batchDeleteMailState.status === 'loading'}
            onClose={unselect}
            onDelete={deleteSelected}
          />
        )}
        active={!!selectedMessage}
      />
    </>
  );
}
