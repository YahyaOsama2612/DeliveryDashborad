import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import useAuthStore from '../store/useAuthStore';

const useTrackingSocket = () => {
  const token = useAuthStore((state) => state.token);
  const [connectionState, setConnectionState] = useState({
    token: null,
    socket: null,
    status: 'disconnected',
  });

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(api.defaults.baseURL, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token },
    });
    const updateStatus = (status) =>
      setConnectionState({ token, socket, status });
    const handleConnect = () => updateStatus('connected');
    const handleDisconnect = () => updateStatus('disconnected');
    const handleConnectError = (error) => {
      console.error('Tracking socket connection failed:', error);
      updateStatus('error');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.disconnect();
    };
  }, [token]);

  const isCurrentToken = token && connectionState.token === token;
  return {
    socket: isCurrentToken ? connectionState.socket : null,
    status: !token
      ? 'disconnected'
      : isCurrentToken
        ? connectionState.status
        : 'connecting',
  };
};

export default useTrackingSocket;
