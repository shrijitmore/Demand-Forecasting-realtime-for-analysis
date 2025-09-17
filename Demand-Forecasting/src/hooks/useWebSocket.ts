import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = ({
  url,
  onMessage,
  onError,
  onOpen,
  onClose,
  autoReconnect = true,
  reconnectInterval = 5000,
}: UseWebSocketOptions) => {
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = (event) => {
        setReadyState(WebSocket.OPEN);
        onOpen?.(event);
        console.log('WebSocket connected:', url);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setLastMessage(event.data);
          onMessage?.(event.data);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setReadyState(WebSocket.CLOSED);
        onError?.(error);
      };

      wsRef.current.onclose = (event) => {
        setReadyState(WebSocket.CLOSED);
        onClose?.(event);
        console.log('WebSocket closed:', event.code, event.reason);

        // Auto-reconnect if enabled
        if (autoReconnect && !event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setReadyState(WebSocket.CLOSED);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && readyState === WebSocket.OPEN) {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(messageString);
    } else {
      console.warn('WebSocket is not open. Message not sent:', message);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    readyState,
    lastMessage,
    sendMessage,
    disconnect,
  };
};

export const WebSocketReadyState = {
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED,
} as const;