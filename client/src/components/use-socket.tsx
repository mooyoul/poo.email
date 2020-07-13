import * as React from 'react';

type SocketContainer = {
  socket?: WebSocket;
};

type SocketState = 'disconnected' | 'connecting' | 'connected';

const container: SocketContainer = {};

export function useSocket(url: string) {
  const [socketState, setSocketState] = React.useState<SocketState>((() => {
    const readyState = container.socket?.readyState ?? -1;

    switch (readyState) {
      case 0: return 'connecting';
      case 1: return 'connected';
      default: return 'disconnected';
    }
  })());

  const onOpen = React.useCallback(() => {
    setSocketState('connected');
  }, []);

  const onClose = React.useCallback(() => {
    setSocketState('disconnected');
  }, []);

  const connect = (
    onConnect: () => void,
    onMessage: (event: MessageEvent) => void,
  ) => {
    let { socket } = container;

    const socketCreationRequired = !socket
      || socket.readyState === 2
      || socket.readyState === 3;

    if (socketCreationRequired) {
      socket = new WebSocket(url);
      container.socket = socket;
      setSocketState('connecting');
    }

    socket!.addEventListener('open', onOpen);
    socket!.addEventListener('close', onClose);
    socket!.addEventListener('message', onMessage);

    if (socket!.readyState === 1) {
      onConnect();
    } else {
      socket!.addEventListener('open', onConnect, { once: true });
    }

    return () => {
      socket!.removeEventListener('open', onOpen);
      socket!.removeEventListener('close', onClose);
      socket!.removeEventListener('message', onMessage);
      socket!.removeEventListener('open', onConnect);
    };
  };

  const disconnect = () => {
    const { socket } = container;
    if (socket) {
      socket.close();
      container.socket = undefined;
    }
  };

  return {
    socketState,
    container,
    connect,
    disconnect,
  };
}
